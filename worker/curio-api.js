/* ═══════════════════════════════════════════════════════════════════════════
 *  CURIO — LE VÉRIFICATEUR
 *  Un « Worker » Cloudflare. Environ 200 lignes, aucune dépendance.
 *
 *  ─── à quoi il sert ───────────────────────────────────────────────────────
 *
 *  L'application n'a pas de serveur, et c'est bien. Mais deux choses ne
 *  peuvent pas se faire depuis un navigateur :
 *
 *    · demander à Polar si une clé est toujours valable — l'API de Polar
 *      n'est pas faite pour être appelée depuis une page web, et sa
 *      documentation demande explicitement de ne pas mettre l'identifiant
 *      d'organisation dans une application cliente ;
 *    · retrouver la clé qui vient d'être créée après un paiement, ce qui
 *      exige un jeton secret.
 *
 *  Ce programme fait les deux, et rien d'autre. Il tient dans le plan gratuit
 *  de Cloudflare : 100 000 requêtes par jour.
 *
 *  ─── ce qu'il expose ──────────────────────────────────────────────────────
 *
 *    POST /api/activer       { cle, appareil } -> { etat, activation, plan, expire }
 *         C'est ici que se joue la LIMITE D'APPAREILS. Polar compte les
 *         activations d'une cle ; au-dela du nombre regle dans le benefice,
 *         il refuse, et on repond etat:'trop-d-appareils'.
 *
 *    POST /api/verifier      { cle, activation } -> { etat, plan, expire }
 *         etat : 'ok' | 'revoquee' | 'expiree' | 'inconnue' | 'trop-d-appareils'
 *
 *    GET  /api/retour?checkout_id=...
 *         L'adresse de retour de vos liens de paiement Polar. Elle retrouve
 *         la clé du client et le renvoie vers l'application, déjà ouverte.
 *
 *    GET  /api/sante
 *         Dit si les réglages sont en place. À ouvrir une fois après
 *         installation, et à oublier.
 *
 *  ─── installation, dans l'interface de Cloudflare ────────────────────────
 *
 *  1. Workers & Pages -> Create -> Worker -> nom : curio-api -> Deploy
 *  2. Edit code -> tout effacer -> coller CE FICHIER -> Deploy
 *  3. Settings -> Variables and Secrets :
 *       POLAR_TOKEN   type Secret     votre jeton d'organisation Polar
 *       POLAR_ORG     type Text       votre identifiant d'organisation
 *       SITE          type Text       https://votre-domaine.com
 *       POLAR_API     type Text       (facultatif) https://sandbox-api.polar.sh
 *                                     pour essayer sans vraie carte
 *  4. Settings -> Domains & Routes -> Add route ->
 *       votre-domaine.com/api/*        zone : votre-domaine.com
 *
 *  Le jeton Polar ne quitte jamais Cloudflare. Il n'est écrit nulle part dans
 *  le dépôt, et l'application ne le voit jamais.
 *
 *  ─── droits nécessaires sur le jeton Polar ───────────────────────────────
 *      checkouts:read        lire la commande au retour du paiement
 *      license_keys:read     lire l'état d'une clé
 *      customer_sessions:write   ouvrir une session client le temps de
 *                                retrouver sa clé
 * ═══════════════════════════════════════════════════════════════════════════ */

const DEFAUT_API = 'https://api.polar.sh';

/* Les réponses sont lues par une page web : sans ces en-têtes, le navigateur
   refuse de les regarder. On n'ouvre qu'aux méthodes utilisées. */
function cors(env) {
  return {
    'Access-Control-Allow-Origin': env.SITE || '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function json(data, env, statut) {
  return new Response(JSON.stringify(data), {
    status: statut || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      /* Une réponse de licence ne se met jamais en cache, ni chez Cloudflare
         ni chez le navigateur : une clé révoquée resterait valable. */
      'Cache-Control': 'no-store',
      ...cors(env)
    }
  });
}

function api(env) {
  return String(env.POLAR_API || DEFAUT_API).replace(/\/+$/, '');
}

async function polar(env, chemin, options) {
  const o = options || {};
  const r = await fetch(api(env) + chemin, {
    method: o.method || 'GET',
    headers: {
      'Authorization': 'Bearer ' + env.POLAR_TOKEN,
      'Content-Type': 'application/json',
      ...(o.headers || {})
    },
    body: o.body ? JSON.stringify(o.body) : undefined
  });
  let corps = null;
  try { corps = await r.json(); } catch (e) { corps = null; }
  return { ok: r.ok, statut: r.status, corps: corps };
}

/* ── QUELLE FORMULE ? ──────────────────────────────────────────────────────
   Polar ne dit pas « abonnement » ou « à vie » sur la clé elle-même. Il dit
   une date d'expiration, ou pas. Une clé sans date est un achat définitif ;
   une clé avec date est un abonnement, qui sera prolongé au renouvellement.
   C'est la distinction dont l'application a besoin, et la seule. */
function formule(cle) {
  return cle && cle.expires_at ? 'sub' : 'lifetime';
}

/* ── L'ACTIVATION, ET LA LIMITE D'APPAREILS ────────────────────────────────
   Une cle sans limite s'installe partout : elle circule, et un abonnement
   paye par un devient un abonnement lu par vingt.

   Polar compte les activations. Chaque appareil en consomme UNE, et le
   nombre se regle dans le benefice « License Keys » (champ « Limit
   activations »). Quand la limite est atteinte, il refuse — et le client
   libere un appareil depuis son espace client, tout seul, sans vous ecrire.

   L'etiquette sert a ca : elle doit lui permettre de reconnaitre lequel
   liberer. « Chrome sur Android · 8 sept. » se reconnait ; un identifiant
   ne se reconnait pas. */
async function activer(env, cle, appareil) {
  const r = await polar(env, '/v1/customer-portal/license-keys/activate', {
    method: 'POST',
    body: {
      key: cle,
      organization_id: env.POLAR_ORG,
      label: String(appareil || 'appareil').slice(0, 80)
    }
  });

  if (r.ok && r.corps) {
    const k = r.corps.license_key || r.corps;
    return { etat: 'ok', activation: r.corps.id || null,
             plan: formule(k), expire: k.expires_at || null };
  }

  /* Polar refuse pour deux raisons tres differentes, et les confondre serait
     desastreux : « cle inconnue » accuse le client de s'etre trompe, « trop
     d'appareils » lui dit quoi faire. On lit son message. */
  const msg = JSON.stringify(r.corps || '').toLowerCase();
  if (r.statut === 403 || /activation|limit|exceed|maximum/.test(msg)) {
    return { etat: 'trop-d-appareils' };
  }
  if (r.statut === 404 || r.statut === 422) return { etat: 'inconnue' };
  return { etat: 'inconnue' };
}

/* ── LA VÉRIFICATION ───────────────────────────────────────────────────────
   On passe par l'API « portail client », qui est celle prévue pour ça. Elle
   répond aussi bien pour une clé révoquée que pour une clé inconnue ; on
   traduit ses réponses dans les quatre mots que l'application comprend. */
async function verifier(env, cle, activation) {
  const corps = { key: cle, organization_id: env.POLAR_ORG };
  /* On revalide L'ACTIVATION de cet appareil-la, pas seulement la cle : si le
     client l'a liberee depuis son espace client pour la donner a un autre
     appareil, celui-ci doit se refermer. Sans ce champ, liberer un appareil
     n'aurait aucun effet et la limite ne limiterait rien. */
  if (activation) corps.activation_id = String(activation);
  const r = await polar(env, '/v1/customer-portal/license-keys/validate', {
    method: 'POST', body: corps
  });

  if (r.statut === 404 || r.statut === 422) return { etat: 'inconnue' };
  if (!r.ok || !r.corps) return { etat: 'inconnue' };

  const k = r.corps;
  if (k.status && k.status !== 'granted') return { etat: 'revoquee' };
  /* Une activation retiree se voit ici : Polar ne la retrouve plus. */
  if (activation && r.corps.activation && r.corps.activation.id
      && r.corps.activation.id !== activation) return { etat: 'revoquee' };
  if (k.expires_at && new Date(k.expires_at).getTime() < Date.now()) return { etat: 'expiree' };

  return { etat: 'ok', plan: formule(k), expire: k.expires_at || null };
}

/* ── LE RETOUR DE PAIEMENT ─────────────────────────────────────────────────
   Polar renvoie l'acheteur ici avec l'identifiant de sa commande. Trois
   appels, et il repart vers l'application avec sa clé.

   Elle voyage dans le FRAGMENT (#cle=…), jamais dans un paramètre : un
   fragment n'est pas envoyé au serveur, n'entre dans aucun journal, et ne
   part pas dans l'en-tête Referer à la première image chargée. */
async function retour(env, url) {
  const site = String(env.SITE || '').replace(/\/+$/, '');
  const echec = site + '/app.html?paiement=recu';

  const id = url.searchParams.get('checkout_id');
  if (!id) return Response.redirect(echec, 302);

  /* 1 · la commande, pour connaître le client */
  const c = await polar(env, '/v1/checkouts/' + encodeURIComponent(id));
  const clientId = c.ok && c.corps ? c.corps.customer_id : null;
  if (!clientId) return Response.redirect(echec, 302);

  /* 2 · une session à son nom, le temps de lire ses clés */
  const s = await polar(env, '/v1/customer-sessions/', {
    method: 'POST',
    body: { customer_id: clientId }
  });
  const jeton = s.ok && s.corps ? s.corps.token : null;
  if (!jeton) return Response.redirect(echec, 302);

  /* 3 · ses clés */
  const l = await fetch(api(env) + '/v1/customer-portal/license-keys/?organization_id='
                        + encodeURIComponent(env.POLAR_ORG || ''), {
    headers: { 'Authorization': 'Bearer ' + jeton }
  });
  let liste = null;
  try { liste = await l.json(); } catch (e) { liste = null; }

  const items = liste && Array.isArray(liste.items) ? liste.items : [];
  /* La plus récente qui soit encore accordée. Un client qui rachète après
     avoir résilié en a deux ; c'est la neuve qu'il attend. */
  const bonne = items
    .filter(k => !k.status || k.status === 'granted')
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];

  if (!bonne || !bonne.key) return Response.redirect(echec, 302);
  return Response.redirect(site + '/app.html#cle=' + encodeURIComponent(bonne.key), 302);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const chemin = url.pathname.replace(/^\/api/, '') || '/';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(env) });
    }

    if (chemin === '/sante') {
      return json({
        etat: 'debout',
        jeton: env.POLAR_TOKEN ? 'present' : 'MANQUANT',
        organisation: env.POLAR_ORG ? 'presente' : 'MANQUANTE',
        site: env.SITE || 'MANQUANT',
        api: api(env)
      }, env);
    }

    if (chemin === '/retour' && request.method === 'GET') {
      if (!env.POLAR_TOKEN || !env.SITE) return new Response('Reglages incomplets', { status: 500 });
      try { return await retour(env, url); }
      catch (e) { return Response.redirect(String(env.SITE).replace(/\/+$/, '') + '/app.html?paiement=recu', 302); }
    }

    if (chemin === '/activer' && request.method === 'POST') {
      if (!env.POLAR_TOKEN || !env.POLAR_ORG) return json({ etat: 'inconnue' }, env);
      let corps = null;
      try { corps = await request.json(); } catch (e) { corps = null; }
      const cle = corps && typeof corps.cle === 'string' ? corps.cle.trim() : '';
      if (!cle || cle.length < 8 || cle.length > 200) return json({ etat: 'inconnue' }, env);
      try { return json(await activer(env, cle, corps && corps.appareil), env); }
      catch (e) { return json({ etat: 'inconnue' }, env); }
    }

    if (chemin === '/verifier' && request.method === 'POST') {
      if (!env.POLAR_TOKEN || !env.POLAR_ORG) return json({ etat: 'inconnue' }, env);
      let corps = null;
      try { corps = await request.json(); } catch (e) { corps = null; }
      const cle = corps && typeof corps.cle === 'string' ? corps.cle.trim() : '';
      /* Une clé vide ou absurde ne mérite pas un appel à Polar : on répond
         tout de suite, et on ne prête pas le Worker à qui voudrait s'en
         servir pour tester des clés au hasard. */
      if (!cle || cle.length < 8 || cle.length > 200) return json({ etat: 'inconnue' }, env);
      const act = corps && typeof corps.activation === 'string' ? corps.activation : '';
      try { return json(await verifier(env, cle, act), env); }
      catch (e) { return json({ etat: 'inconnue' }, env, 200); }
    }

    return new Response('Curio — vérificateur. Rien à voir ici.', {
      status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
};
