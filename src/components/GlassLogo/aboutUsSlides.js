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
    // The small caption under the photo describes the picture itself (not
    // "our impact" — that's the left-column headline/body's own territory,
    // still a generic placeholder like slide three's) — real copy not
    // written yet, same bracket convention as every other still-TBD string
    // here.
    alt: '[ A description of this image — to be added. ]',
    headline: '[Our impact working with Noordhuys, to be added. ]',
    // Lorem ipsum, temporarily, in place of the placeholder single-line body
    // above — asked for directly, to see how this column reads with real
    // paragraphs. Two separate blocks (see bodySecondary and its own render
    // in AboutUsIntro.jsx), not one longer run-on paragraph — asked for
    // directly, an actual line break between them. Revert both to the
    // placeholder once real copy exists.
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.',
    // A second paragraph, same weight/size as body above (see its render) —
    // roughly two lines' worth, not a third sentence tacked onto the first.
    bodySecondary:
      'Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui. Curabitur non nulla sit amet nisl tempus convallis quis ac lectus.',
  },
  {
    photo: '/drp-photo.jpg',
    alt: '[ A description of this image — to be added. ]',
    headline: '[Our impact at De Rooi Pannen, to be added. ]',
    body: '[ A paragraph on how we work together — to be added. ]',
  },
  {
    photo: TEAM_PHOTO_SRC,
    alt: '[ A description of this image — to be added. ]',
    headline: '[ A short, catchy line about xXenta — to be added. ]',
    body: '[ A paragraph on our work as a small team, and on being a Google Cloud partner — to be added. ]',
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
