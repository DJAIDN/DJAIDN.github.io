# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: bookers.** Event organizers, bars, clubs, campings and private-event hosts in Nantes, Vendée and the West of France. They check whether AIDN fits their crowd, look at the gear rider and past dates, and get in touch for a quote. When booker and fan needs conflict, bookers win.
- **Secondary: fans and other DJs.** People who saw a set or found a mix on Instagram/TikTok. They come to listen to the remixes and edits and download them for their own sets.

## Product Purpose

A presskit site (djaidn.fr) for AIDN, a DJ and producer from Vendée. It exists to get dates booked: it shows who AIDN is, what he plays, where he has played and will play, what he needs technically, and how to reach him. Success means bookers reach out (by email or Instagram) and fans listen to the music.

## Positioning

- **Young and rising:** 19, self-taught, building his sound through regular mixes on Instagram and TikTok, and playing a growing list of Nantes venues (Maximo Club, WAX BAR, D3, Australian Cafe…). The rise is shown by the dates, not just claimed.
- **Musician-producer, not only a selector:** plays drums, piano and guitar, produces and composes, makes his own edits and remixes (published on the Musique page), and brings a theatre background to the stage.

Genre range (rap, hip-hop, afro, amapiano, shatta, trap, dancehall, hard techno, open format) is the playing scope, not the main differentiator.

## Operating Context

- Bookers usually arrive from Instagram/TikTok or a local search ("DJ Nantes", "DJ Vendée"), often on a phone, and decide quickly.
- Booking happens off-site: by email (contact@djaidn.fr) or Instagram DM. The site has no form or payment.
- Fans listen in the browser and download MP3s only after accepting the terms (unofficial edits, set use only, no republishing or resale).

## Capabilities and Constraints

- Static site on GitHub Pages (custom domain via `CNAME`): `index.html` (hero, bio, booking + rider, dates, media, contact), `musique.html` (audio player + gated downloads), with vanilla CSS/JS.
- **`dates.json` is written by an external application**, which commits upcoming dates and keeps past ones as history automatically. Never edit it by hand or change its format as a side effect of site work. The site reads it to render upcoming dates and history.
- `venues.json` maps venue names to links (Instagram, website, Maps). It is maintained by hand.
- The content is in French. Local SEO (meta, Open Graph, schema.org Person/Service with Nantes, Vendée, Pays de la Loire) is already in place.
- YouTube channel: announced as "prochainement", not live yet.

## Brand Commitments

- Name: **AIDN**.
- Logo and art direction by **@rmy_draw** are binding: keep them and keep the credit.
- Voice: first person on the site ("Ce que j'ai produit", "retrouve-moi"), and third person in the bio. Direct and casual, with dancefloor energy.

## Evidence on Hand

- Photos: `assets/AIDN_2.jpg` (hero), `assets/bio-live.jpg`, gigs in `assets/photos/` (Australian Cafe `Austra1–4`, `Mousse1–3`).
- Logo `assets/AIDNwLogo.png`, OG image `assets/og-aidn.jpg`, stickers `assets/stickers.svg`.
- Music: 4 tracks in `assets/audio/` (Omen AIDN Hard Remix, Asalto Bouyon Edit, Allo Doudou Edit, POUKWA Edit).
- Real dates and venues in `dates.json` / `venues.json`.
- Socials: Instagram @aidn1dj, TikTok @dj_aidn, SoundCloud aidn_off.
- **Absent, do not fabricate:** testimonials, organizer quotes, attendance numbers, follower counts, press coverage, prices and fees, and official releases or label deals.

## Product Principles

1. **The booker decides in a minute.** Who he is, what he plays, proof he plays out, rider and contact should all be reachable fast, on a phone.
2. **Show the rise with real proof.** Dates, venues, photos and mixes carry the "rising" story. No inflated claims.
3. **Producer, not just a playlist.** The edits, the instruments and the stage presence are part of the pitch, so the Musique page supports booking.
4. **Respect the rights.** The edits are unofficial and shared for set use only, and the download terms stay clear and enforced.
