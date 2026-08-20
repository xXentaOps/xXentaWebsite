// Team data for the About Us "Meet the Team" carousel (TeamCarousel). Names
// are real; `role`, `bio` and `email` are still stand-ins, marked with the
// same obvious-placeholder bracket convention ClientLogoCarousel uses for
// its own placeholder client names, so none of them could be mistaken for
// real content if this shipped as-is. Replace the bracketed strings (and
// the example.com addresses) as the real copy arrives; nothing else here
// needs to change with them.
//
// Order is left-to-right in the group photo (the seven people, then the two
// dogs) and is what the carousel's own scroll order follows directly.
//
// x/y and headTop no longer drive any live layout — each member's carousel
// photo is a pre-cropped file at public/team/{id}.jpg (see TeamCarousel),
// not sampled from the group photo at runtime. They're kept here as the
// record of exactly where in the group photo each crop came from: x/y is
// each member's face as a percentage of the photo's own width/height
// (measured against a labelled grid rather than estimated by eye), and
// headTop is the separately-measured top of their own hair/head (it has to
// be its own measurement, not "y minus some constant" — that constant would
// have to somehow know how much hair, or for Ardie how little, sits above
// each person's own face-center point). Re-cropping from a new or better
// group photo — see public/team-photo.jpg — starts from these same numbers.
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
