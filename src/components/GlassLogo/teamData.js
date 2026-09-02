// Team data for the About Us "Meet the Team" carousel (TeamCarousel) and
// detail view (MeetTheTeamGrid). Names are real; `role` and `email` are
// still stand-ins for most members, marked with the same obvious-placeholder
// bracket convention ClientLogoCarousel uses for its own placeholder client
// names, so none of them could be mistaken for real content if this shipped
// as-is. Replace the remaining bracketed strings (and the example.com
// addresses) as the real copy arrives; nothing else here needs to change
// with them.
//
// `bio` is an array of paragraph strings, not one block of text — real bios
// run several paragraphs, and the detail view renders each as its own <p>
// so the paragraph breaks the copy was written with survive into the page
// rather than collapsing into one run-on block (plain HTML/JSX ignores
// blank lines inside a string). TeamCarousel's compact card just joins them
// with a space before its own line-clamp-3 truncates the result — paragraph
// breaks don't matter for a three-line preview.
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
//
// nameIcon: a small glass icon hung beside a member's name in the detail
// view (see MeetTheTeamGrid/AboutUsSection), chosen to nod at something in
// their own bio. Optional — omit the field entirely for a member with no
// icon yet. Fields:
//   svg          required. The file's basename under public/ (no extension).
//   viewBoxSize  required. That file's own declared SVG viewBox width —
//                every icon here comes from a different source with a
//                different native size, and GlassIcon needs the real one to
//                keep its extrusion depth reading as the same relative
//                thickness regardless of which icon is showing.
//   depthScale   optional, default 1 (no amplification — the same depth
//                ratio GlassCircle/the plaque use, which reads correctly on
//                a solid, densely-filled shape). Only the graduation cap
//                overrides this: its thin arms with empty space between
//                them read as flat at ratio 1, so it needs real
//                amplification to show a depth wall at all. Confirmed
//                directly that applying that same amplification to a solid
//                shape instead makes *it* read as "super thick" — this is a
//                per-shape correction, not a per-icon-in-general one.
//   sizeScale    optional, default 1. A shape that fills its own bounding
//                box densely reads as visibly bigger than a sparse one even
//                once both are normalized to the same target size — used to
//                pull a too-large-looking dense icon back down slightly.
//   offsetX      optional, default 0. CSS px nudge on the marker's default
//                flex position (see MeetTheTeamGrid) — for a member whose
//                two name lines are very different widths, since the
//                marker's default spot is right of the *whole* (widest-line)
//                name block.
//   bevelEnabled optional, default true. False for a source shape where a
//                thin feature (a narrow connecting line between two wider
//                shapes) is narrower than the bevel's own inset, which makes
//                the bevel geometry self-intersect right at that thin spot —
//                reads as z-fighting/flicker, not fixed by depthScale or
//                sizeScale since neither touches the bevel's own inset math.
//                See GlassIcon's own extrudeSettingsFor comment.
export const TEAM_MEMBERS = [
  {
    id: 'JeroenSchilders',
    photo: 'JeroenSchilders.jpg',
    name: 'Jeroen Schilders',
    role: 'Senior Consultant',
    bio: [
      'As Senior Consultant at xXenta, Jeroen Schilders combines a strong background in the agri-food sector and vocational education with deep expertise in technology, software development, and AI. He believes that technology only creates real value when it empowers people in their daily work. Guided by this philosophy, he develops solutions that make knowledge not only accessible but immediately actionable at the moment it is needed most.',
      'With years of experience in Learning & Development, software development, and digital learning solutions, Jeroen understands how technology, content, and business processes can reinforce one another. He translates complex challenges into intelligent, scalable solutions where AI, performance support, and knowledge management come together. His focus extends beyond content alone to the technical infrastructure required to ensure that knowledge remains accessible, searchable, and usable over time.',
      'At xXenta, Jeroen serves as Senior Consultant, contributing to the development of the xXenta platform and its underlying AI infrastructure. He bridges the gap between technology, user experience, and the day-to-day reality of organizations. His strength lies in designing solutions that are technically robust while remaining intuitive and user-friendly. For Jeroen, technology is never an end in itself—it should enable people to learn faster, collaborate more effectively, and perform at their best.',
      'Outside of work, Jeroen is a practical and grounded person. He enjoys recharging by walking in nature, tackling DIY projects, cooking, and spending time with his family. This combination of curiosity, craftsmanship, and a genuine focus on people is reflected in everything he does, creating technology that is not only smart, but truly meaningful.',
    ],
    email: 'name@example.com',
    linkedin: 'https://www.linkedin.com/in/jeroen-schilders-59282798/',
    // sizeScale: computer.svg is a solid, densely-filled shape — at the
    // same target size as the sparser icons it read as visibly too big.
    // First guess, meant to be tuned live.
    nameIcon: { svg: 'computer', viewBoxSize: 24, sizeScale: 0.8 },
    x: 16.3,
    y: 13,
    headTop: 10.5,
    isDog: false,
  },
  {
    id: 'JulianaVenturi',
    photo: 'JulianaVenturi.jpg',
    name: 'Juliana Müller Venturi',
    role: 'Lead Web & Product Designer',
    bio: [
      'As Lead Web & Product Designer at xXenta, Juliana Müller Venturi is a passionate advocate for crafting digital experiences that people genuinely enjoy using. With a diverse background spanning technical user interface architecture, cognitive accessibility research, and award-winning art direction, she brings a uniquely holistic perspective to product design. Having graduated Summa Cum Laude in Digital Design, her expertise lives exactly at the intersection of aesthetic appeal and rigorous usability.',
      'Juliana knows better than anyone that even the most intelligent AI is only as powerful as the interface that delivers it. Her approach is rooted in the conviction that technology must seamlessly adapt to human cognition, not the other way around. At xXenta, she translates this philosophy into reality by directing a talented team of designers and developers. By managing end-to-end UIX and rigorous workflow mapping, Juliana builds the critical bridge between our Gemini-powered AI architecture and the professionals in healthcare and education who rely on it daily.',
      'Beyond the screen, Juliana’s drive to build functional, people-first systems extends directly into her community. As a dedicated advocate for social impact, she co-founded a non-profit initiative with Tilburg University that actively connects unhoused students with welcoming local host families. Whether she is designing an intuitive AI learning ecosystem, illustrating for international bestsellers, or driving community action, Juliana is motivated by the exact same purpose—building empathetic, functional systems that meaningfully improve people’s lives.',
    ],
    email: 'name@example.com',
    linkedin: 'https://www.linkedin.com/in/juliana-muller-venturi/',
    // sizeScale: same "dense shape reads bigger" correction as computer.svg
    // above, milder here — went 0.92, then 0.88, then 0.8 chasing "a bit
    // smaller" each time, then overshot ("a tiny bit bigger again"). Split
    // the difference between the last two.
    // offsetX pushes/pulls it relative to the default flex-gap spot right
    // against the name block. Was 50 pre-"Müller": the marker sits off the
    // *whole* w-fit box's own right edge, which sizes to its widest line —
    // splitName cuts on the first space only, so "Müller" landed on the
    // *second* line ("Müller Venturi", 78px bold), roughly doubling that
    // line's own width versus "Venturi" alone. A first ~30px pull-in did
    // nothing visible against a shift that size, so this corrects hard in
    // the other direction instead — a rough estimate of that width jump,
    // meant to land near where the marker sat relative to "Venturi" before,
    // not a small nudge. Tune live from here.
    nameIcon: { svg: 'canvas', viewBoxSize: 24, sizeScale: 0.84, offsetX: -180 },
    x: 29.2,
    y: 19,
    headTop: 17,
    isDog: false,
  },
  {
    id: 'RenateVanDijken',
    photo: 'RenateVanDijken.jpg',
    name: 'Renate van Dijken',
    role: 'Chief Business Development & Strategy Officer',
    bio: [
      'Renate van Dijken is a strategic leader and expert in organizational change. As a partner, member of the board, and Lead Business Development & Strategy at xXenta, she bridges the gap between human potential and AI-driven performance.',
      "Renate combines deep knowledge of organizational psychology, behavioral science, and change management. Her approach is rooted in the conviction that AI implementation only succeeds when the human factor remains at the core. By integrating change management expertise with xXenta's 4D model, she helps organizations in healthcare, education, and the corporate sector to structurally embed learning and performance into their daily work practices.",
      'With over twenty years of experience in leadership development and transformation, Renate has garnered international recognition. Her work with leadership expert John C. Maxwell resulted in a globally adopted leadership methodology, utilized by thousands of trainers to fundamentally transform culture and communication. In her role at xXenta, she develops new concepts and alliances to further shape the harmony between human craftsmanship and intelligent technology.',
    ],
    email: 'name@example.com',
    linkedin: 'https://www.linkedin.com/in/renatevandijken/',
    nameIcon: { svg: 'communication', viewBoxSize: 72 },
    x: 39,
    y: 14,
    headTop: 10.5,
    isDog: false,
  },
  {
    id: 'JeroenKrouwels',
    photo: 'JeroenKrouwels.jpg',
    name: 'Jeroen Krouwels',
    role: 'Chief Commercial Officer & Head of Education',
    bio: [
      'As Co-founder, Member of the Board, and Lead Sales & Education, Jeroen Krouwels is a passionate entrepreneur with a keen eye for the future of learning. His career began in education as an educational specialist with expertise in modern foreign languages before evolving into the successful founding and leadership of several software companies. This unique combination of educational expertise, entrepreneurship, and technological innovation forms the foundation of his work at xXenta.',
      "With decades of experience in Learning & Development, Jeroen knows better than anyone that learning only creates value when it translates into everyday practice. That is precisely why xXenta's mission resonates so strongly with him: bridging the traditional gap between learning and working. Rather than relying on stand-alone training programs or one-time knowledge transfer, he believes in continuous learning embedded in the flow of work, supported by intelligent AI solutions that help people exactly when they need it. As a sought-after keynote speaker, Jeroen has a unique talent for making complex technological developments accessible and inspiring people to embrace the AI transformation with confidence.",
      'At xXenta, Jeroen serves as Lead Sales & Education, building the bridge between our innovative AI technology and the day-to-day reality of education. He is dedicated to helping educational institutions leverage AI to create more meaningful, effective, and future-ready learning experiences.',
      "Beyond his entrepreneurial career, Jeroen is, above all, a creative spirit. As a keyboard player, composer, and songwriter, he enjoys writing and performing his own music in his spare time. His passion for storytelling and creativity extends far beyond music: one of his lifelong dreams is to write an original theatre production. Whether through technology, learning, or the arts, Jeroen is driven by the same purpose—to touch people's lives, inspire them, and set meaningful change in motion.",
    ],
    email: 'name@example.com',
    linkedin: 'https://www.linkedin.com/in/jeroenkrouwels/',
    // Graduation cap for his roots as an educational specialist, mentioned
    // in his own bio above. depthScale: this shape is thin arms (a diamond
    // outline, a band, a tassel) with a lot of empty space between them —
    // at the default depth ratio every other icon uses it read as flat, no
    // depth wall at all. This is the one shape that needs the amplification;
    // see GlassIcon's own extrudeSettingsFor comment for why it isn't the
    // default for everyone.
    nameIcon: { svg: 'graduation-cap', viewBoxSize: 24, depthScale: 4 },
    x: 62.5,
    y: 13,
    headTop: 11.5,
    isDog: false,
  },
  {
    id: 'NormaWoutersSnell',
    photo: 'NormaWoutersSnell.jpg',
    name: 'Norma Wouters-Snell',
    role: 'Chief Security and Compliance Officer',
    bio: [
      "As Chief Security Officer, Norma Wouters-Snell is the unwavering architect of xXenta's operational foundation. With over a decade of experience as the founder of Noble Achievers, she has dedicated her career to the art of organizational design, recognizing that robust policies, streamlined processes, and clear procedures are the essential prerequisites for any successful enterprise.",
      "At xXenta, Norma translates this expertise into our core mission: providing the secure, AI-native infrastructure required for seamless performance. She manages our security frameworks, compliance standards, and ISO certifications with a sharp eye for the critical requirements of the EU AI Act. By integrating rigorous due diligence into the heart of our systems, she ensures that our clients can scale their AI adoption safely, turning compliance from a hurdle into a strategic competitive advantage.",
      "Norma's work is driven by a deep-rooted commitment to professional excellence and ethical responsibility. Her long-standing role as an Amfori Network Representative for the Netherlands underscores her ability to govern complex sustainability and retail standards—insights that now form the bedrock of xXenta's 'Human Potential, AI Accelerated' approach.",
      "Norma connects the 'hard' requirements of technical security to the 'soft' necessity of organizational trust. Her approach is precise, focused, and purposeful—qualities she also brings to her personal life as a dedicated sport shooter, where hitting the mark is the only acceptable outcome. Back at the office, she is supported by her two dogs, our unofficial 'Chief Happiness Officers,' who keep the team grounded. For Norma, security is not just about protection; it is about building the high-functioning, reliable systems that allow human potential to truly thrive.",
    ],
    email: 'name@example.com',
    linkedin: 'https://www.linkedin.com/in/norma-wouters-snell-6116153/',
    // offsetX pulls the icon left from its default spot (right of her full
    // name block, which sizes to her much wider "Wouters-Snell" line) back
    // in toward her shorter first name — asked for directly. Negative CSS
    // px, a first guess meant to be tuned live rather than treated as final.
    // sizeScale: shield.svg is a solid, densely-filled shape — same "reads
    // bigger than a sparse shape at the same target size" correction as
    // computer.svg/canvas.svg above.
    nameIcon: { svg: 'shield', viewBoxSize: 16, offsetX: -180, sizeScale: 0.85 },
    x: 75,
    y: 18,
    headTop: 15.8,
    isDog: false,
  },
  {
    id: 'ArdieVanHonk',
    photo: 'ArdieVanHonk.jpg',
    name: 'Ardie van Honk',
    role: 'CEO',
    bio: [
      'Serving as CEO at xXenta, Ardie van Honk brings a remarkable depth of hands-on expertise to the table, with a career that truly bridges the gap between the shop floor and the boardroom. Having spent 45 years in greenhouse horticulture alongside 15 years in agricultural vocational education, his professional journey is defined by continuous growth. Advancing from a frontline employee to an independent entrepreneur—and from a teaching assistant to a project manager of educational innovation—has given him a profound, inside-out understanding of the sectors he serves.',
      'Ardie firmly believes that organizational learning only delivers actual value when it can be immediately applied on the job. Rather than focusing on deficits, his methodology is built upon the principles of appreciative inquiry and a talent-oriented framework. By identifying and amplifying people’s inherent strengths, he creates knowledge-sharing strategies that genuinely resonate with his target audience and inspire them to excel.',
      'Within his current role, Ardie leverages this deep empathy for customer needs to drive xXenta’s core mission forward. He is instrumental in designing tailor-made, highly personalized development pathways that erase the traditional boundaries between formal education and daily work. Through his efforts, xXenta provides professionals with pragmatic tools that integrate seamlessly into their everyday routines.',
      'Away from the demands of the office, Ardie maintains a grounded, practical outlook on life. He recharges his own batteries by reading, taking long walks, and prioritizing time with his family. Ultimately, whether he is shaping an innovative learning ecosystem or enjoying a quiet weekend at home, Ardie remains dedicated to a singular goal: cultivating growth and bringing out the absolute best in the people around him.',
    ],
    email: 'name@example.com',
    linkedin: 'https://www.linkedin.com/in/ardie-van-honk-a1054230/',
    // Swapped from graph.svg (rebuilt once already to fix a glitch, still
    // not quite right) to document.svg — a solid document-with-folded-
    // corner shape plus three short rounded-rect "text line" bars, all
    // reasonably thick, no near-hairline geometry the way the original
    // graph.svg's diagonal connectors were. viewBoxSize is that file's own
    // viewBox width (32).
    // sizeScale: solid, densely-filled shape — same "reads bigger than a
    // sparse shape at the same target size" correction as the others.
    nameIcon: { svg: 'document', viewBoxSize: 32, sizeScale: 0.8 },
    x: 51.0,
    y: 12.5,
    headTop: 11,
    isDog: false,
  },
  {
    id: 'ArnoWouters',
    photo: 'ArnoWouters.jpg',
    name: 'Arno Wouters',
    role: 'CEO',
    bio: [
      'Arno Wouters is an entrepreneur at heart with a sharp focus on business development and strategic growth. With decades of experience in identifying opportunities and building durable partnerships, he has successfully scaled multiple enterprises to the next level. Arno excels at steering complex, international projects, maintaining clear oversight of responsibilities and milestones while keeping clients shielded from the stress of day-to-day challenges.',
      'As Founder and CEO of xXenta, he combines his expertise in market expansion and change management with the transformative power of AI. His modus operandi is straightforward yet powerful: critically evaluating organizational performance and relentlessly seeking paths for improvement. Arno guides organizations in their transition toward an AI-native work environment, leveraging technology as the invisible infrastructure that empowers teams to achieve their highest potential. His vision is clear: AI is the essential catalyst to accelerate human craftsmanship and anchor operational excellence at the very heart of the organization.',
    ],
    email: 'name@example.com',
    linkedin: 'https://www.linkedin.com/in/arno-wouters/',
    // sizeScale: cog.svg is a solid, densely-filled shape — same "reads
    // bigger than a sparse shape at the same target size" correction as
    // computer.svg/canvas.svg/shield.svg above.
    nameIcon: { svg: 'cog', viewBoxSize: 72, sizeScale: 0.85 },
    x: 84.5,
    y: 10,
    headTop: 5.3,
    isDog: false,
  },
  {
    id: 'dog-1',
    photo: 'dog-1.jpg',
    name: 'Charlie',
    role: '[ Role ]',
    bio: ['[ Paragraph — to be added. ]'],
    x: 26.2,
    y: 81,
    headTop: 75.5,
    isDog: true,
  },
  {
    id: 'dog-2',
    photo: 'dog-2.jpg',
    name: 'Balloo',
    role: '[ Role ]',
    bio: ['[ Paragraph — to be added. ]'],
    x: 52.5,
    y: 82.5,
    headTop: 76.5,
    isDog: true,
  },
]

export default TEAM_MEMBERS
