// Team data for the About Us hover reveal. Names are real; `role`, `bio`
// and `email` are still stand-ins, marked with the same obvious-placeholder
// bracket convention ClientLogoCarousel uses for its own placeholder client
// names, so none of them could be mistaken for real content if this shipped
// as-is. Replace the bracketed strings (and the example.com addresses) as
// the real copy arrives; nothing else here needs to change with them.
//
// Order is left-to-right in the group photo, the seven people first, then
// the two dogs. That ordering is load-bearing: the dogs lie in front of the
// people in the photograph, so their hover zones have to win the region the
// two overlap, which TeamScene arranges by giving them a slightly nearer
// depth — see DOG_HIT_Z there.
//
// x/y is each member's face, as a percentage of the photo's own width and
// height. Measured against a labelled 5%/10% grid rendered over the real
// photo rather than estimated by eye, so these land on the actual faces.
// The hover zone (see hitRect in teamLayout) is placed from this point.
//
// headTop is a second, separately-measured point: the actual top of each
// member's own hair/head (against a finer 1%-labelled grid), not derived
// from x/y by a fixed offset. It has to be its own measurement rather than
// "y minus some constant" because that constant would have to somehow know
// how much hair (or, for Ardie, how little) sits above each person's own
// face-center point — a fixed offset put the hover dot at wildly different
// visual distances above different people's actual heads; measuring where
// each head really ends is what makes that distance the same for everyone.
export const TEAM_MEMBERS = [
  {
    id: 'member-1',
    name: 'Jeroen Schilders',
    role: '[ Role ]',
    bio: '[ Paragraph — a few lines in their own words, to be added. ]',
    email: 'name@example.com',
    linkedin: 'https://www.linkedin.com/in/jeroen-schilders-59282798/',
    x: 16.3,
    y: 13,
    headTop: 10.5,
    isDog: false,
  },
  {
    id: 'member-2',
    name: 'Juliana Venturi',
    role: '[ Role ]',
    bio: '[ Paragraph — a few lines in their own words, to be added. ]',
    email: 'name@example.com',
    linkedin: 'https://www.linkedin.com/in/juliana-muller-venturi/',
    x: 29.2,
    y: 19,
    headTop: 17,
    isDog: false,
  },
  {
    id: 'member-3',
    name: 'Renate van Dijken',
    role: '[ Role ]',
    bio: '[ Paragraph — a few lines in their own words, to be added. ]',
    email: 'name@example.com',
    linkedin: 'https://www.linkedin.com/in/renatevandijken/',
    x: 39,
    y: 14,
    headTop: 10.5,
    isDog: false,
  },
  {
    id: 'member-4',
    name: 'Ardie van Honk',
    role: '[ Role ]',
    bio: '[ Paragraph — a few lines in their own words, to be added. ]',
    email: 'name@example.com',
    linkedin: 'https://www.linkedin.com/in/ardie-van-honk-a1054230/',
    x: 51.0,
    y: 12.5,
    headTop: 11,
    isDog: false,
  },
  {
    id: 'member-5',
    name: 'Jeroen Krouwels',
    role: '[ Role ]',
    bio: '[ Paragraph — a few lines in their own words, to be added. ]',
    email: 'name@example.com',
    linkedin: 'https://www.linkedin.com/in/jeroenkrouwels/',
    x: 62.5,
    y: 13,
    headTop: 11.5,
    isDog: false,
  },
  {
    id: 'member-6',
    name: 'Norma Wouters-Snell',
    role: '[ Role ]',
    bio: '[ Paragraph — a few lines in their own words, to be added. ]',
    email: 'name@example.com',
    linkedin: 'https://www.linkedin.com/in/norma-wouters-snell-6116153/',
    x: 75,
    y: 18,
    headTop: 15.8,
    isDog: false,
  },
  {
    id: 'member-7',
    name: 'Arno Wouters',
    role: '[ Role ]',
    bio: '[ Paragraph — a few lines in their own words, to be added. ]',
    email: 'name@example.com',
    linkedin: 'https://www.linkedin.com/in/arno-wouters/',
    x: 84.5,
    y: 10,
    headTop: 5.3,
    isDog: false,
  },
  {
    id: 'dog-1',
    name: 'Charlie',
    role: '[ Role ]',
    bio: '[ Paragraph — to be added. ]',
    x: 26.2,
    y: 81,
    headTop: 75.5,
    isDog: true,
  },
  {
    id: 'dog-2',
    name: 'Balloo',
    role: '[ Role ]',
    bio: '[ Paragraph — to be added. ]',
    x: 52.5,
    y: 82.5,
    headTop: 76.5,
    isDog: true,
  },
]

export default TEAM_MEMBERS
