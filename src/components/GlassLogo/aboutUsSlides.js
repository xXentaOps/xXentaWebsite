// Split out of AboutUsIntro.jsx, which used to export this data straight
// alongside the component. Mixing component and non-component exports in
// one file breaks React Fast Refresh's ability to hot-swap it cleanly (see
// oxlint's own only-export-components warning, which was firing on that
// file) — edits to the slideshow could silently fail to reach a running
// browser tab via HMR, no error, just stale code still running. Giving this
// data its own file makes AboutUsIntro.jsx a clean component-only module.
export const TEAM_PHOTO_SRC = '/team-photo-web.jpg'

// The photo block is a small slideshow — the group photo (with its own
// "Meet the Team" CTA) always sits last, and whatever comes before it exists
// to be browsed through, not landed on.
export const SLIDES = [
  {
    photo: '/noordhuys-photo.jpg',
    alt: "Showcasing of Noordhuys's First App with xXenta",
    caption: "Showcasing of Noordhuys's First App with xXenta",
    headline: 'Demonstrable Craftsmanship in Partnering with Noordhuys',
    body: 'xXenta helps companies sustainably integrate the complex expectations of retailers and quality marks into daily work processes, allowing you to say goodbye to paper audit stress and transition to demonstrable craftsmanship on the shop floor. We achieve this by making work understandable through visual instructions and safe simulations of practical situations, and by seamlessly connecting all current knowledge, training, and practical assessments within the personal development profile ProMeo ID. In doing so, we use smart technology and data as a quiet engine in the background—not to replace human work, but to give managers and employees the breathing room, clarity, and confidence to deliver the highest quality and food safety together every day.',
    paragraphs: [
      'xXenta helps companies sustainably integrate the complex expectations of retailers and quality marks into daily work processes, allowing you to say goodbye to paper audit stress and transition to demonstrable craftsmanship on the shop floor. We achieve this by making work understandable through visual instructions and safe simulations of practical situations, and by seamlessly connecting all current knowledge, training, and practical assessments within the personal development profile ProMeo ID. In doing so, we use smart technology and data as a quiet engine in the background—not to replace human work, but to give managers and employees the breathing room, clarity, and confidence to deliver the highest quality and food safety together every day.',
    ],
  },
  {
    photo: '/drp-photo.jpg',
    alt: '1st Edition of Knight of the Prompt Hosted at De Rooi Pannen',
    caption: '1st Edition of Knight of the Prompt Hosted at De Rooi Pannen',
    headline: 'Our Impact at De Rooi Pannen',
    body: "Technology shouldn't take over the work of teachers and mentors; it should make it easier. xXenta helps educational institutions and practical training organizations implement AI in a way that creates time for what truly matters: quality instruction, personal guidance, and human connection.",
    bodySecondary:
      'AI offers many opportunities, but technology only adds real value when you know how to use it practically. With Knight of the Prompt, we help teams take control of their own work. Instead of making professionals dependent on a system, we teach them how to use AI as a smart daily tool.',
    bodyTertiary:
      'By learning to ask the right questions and remaining critical thinkers, teams become truly self-reliant. This removes the barrier to working with AI and helps professionals reclaim valuable time—releasing time and space they can directly dedicate to what technology can never replace: their own human craftsmanship.',
    paragraphs: [
      "Technology shouldn't take over the work of teachers and mentors; it should make it easier. xXenta helps educational institutions and practical training organizations implement AI in a way that creates time for what truly matters: quality instruction, personal guidance, and human connection.",
      'AI offers many opportunities, but technology only adds real value when you know how to use it practically. With Knight of the Prompt, we help teams take control of their own work. Instead of making professionals dependent on a system, we teach them how to use AI as a smart daily tool.',
      'By learning to ask the right questions and remaining critical thinkers, teams become truly self-reliant. This removes the barrier to working with AI and helps professionals reclaim valuable time—releasing time and space they can directly dedicate to what technology can never replace: their own human craftsmanship.',
    ],
  },
  {
    photo: TEAM_PHOTO_SRC,
    alt: 'First Official Photoshoot of Our Complete Team',
    caption: 'First Official Photoshoot of Our Complete Team',
    headline: 'It starts with a shared dream.',
    body: "At xXenta, we believe that the future isn't about systems taking over from humans, but about technology that actually gives us wings. We are more than an average tech company; we are a close-knit collective of pioneers, strategists, and original thinkers who challenge the status quo together.",
    bodySecondary:
      "Around our table, you'll find a unique mix of worlds. Educational scientists and organizational psychologists who understand exactly how people learn and grow. Passionate entrepreneurs who turn complex challenges into crystal-clear opportunities. Creative designers who ensure every interaction not only works flawlessly, but also resonates. And uncompromising security architects who lay a rock-solid foundation so that our big dreams are always one hundred percent safe, ethical, and responsible. To that, we add the unprecedented thinking power of our AI developers: the specialists who actually build our technology. They don't write code to replace professionals, but design intelligent systems that seamlessly make work easier in the background.",
    bodyTertiary:
      'We refuse to go along with the blind, cold AI hype. We choose a different path: innovation that gives humans the breathing room to excel once again. Build with us. xXenta is a place where curiosity is celebrated and where we work every day on solutions that truly matter. We are building space for human connection, trust, and genuine care in the workplace.',
    bodyQuaternary:
      'Do you also believe that technology exists to amplify human potential? Whether you are a client, partner, or new talent: we invite you to push boundaries together with us.',
    paragraphs: [
      "At xXenta, we believe that the future isn't about systems taking over from humans, but about technology that actually gives us wings. We are more than an average tech company; we are a close-knit collective of pioneers, strategists, and original thinkers who challenge the status quo together.",
      "Around our table, you'll find a unique mix of worlds. Educational scientists and organizational psychologists who understand exactly how people learn and grow. Passionate entrepreneurs who turn complex challenges into crystal-clear opportunities. Creative designers who ensure every interaction not only works flawlessly, but also resonates. And uncompromising security architects who lay a rock-solid foundation so that our big dreams are always one hundred percent safe, ethical, and responsible. To that, we add the unprecedented thinking power of our AI developers: the specialists who actually build our technology. They don't write code to replace professionals, but design intelligent systems that seamlessly make work easier in the background.",
      'We refuse to go along with the blind, cold AI hype. We choose a different path: innovation that gives humans the breathing room to excel once again. Build with us. xXenta is a place where curiosity is celebrated and where we work every day on solutions that truly matter. We are building space for human connection, trust, and genuine care in the workplace.',
      'Do you also believe that technology exists to amplify human potential? Whether you are a client, partner, or new talent: we invite you to push boundaries together with us.',
    ],
    hasStats: false,
  },
]

// Every distinct photo a slide can show, for AboutUsSection to preload into
// PhotoBackdropCapture's texture cache up front (see preloadPhotoTextures
// there) — the badge's own crossfade can't start until its texture has
// loaded, a separate GPU upload from the DOM photo's own load, and that gap
// was the one thing tuning the fade's speed/duration alone could never
// close. Warming the cache before it's needed closes it at the source
// instead.
export const SLIDE_PHOTOS = SLIDES.map((slide) => slide.photo)
