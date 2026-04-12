import { Pin } from './types';

export const seedPins: Pin[] = [
  {
    id: 'facade-mosaic',
    title: 'The Facade Mosaic',
    location: {
      lat: 37.42716,
      lng: -122.17020,
      physicalArea: 'exterior_facade',
    },
    photo: {
      url: '',
      caption: 'The north facade mosaic — at the time of completion, the largest in America.',
      credit: '',
    },
    inquiry: {
      question:
        'Stand back and look at the mosaic above the entrance together. There are 47 figures up there. Can you find where the women are? Jane Stanford insisted on equal representation — does it look equal to you?',
      answer:
        'This mosaic is 84 feet wide and 30 feet tall. Each piece of glass is hand-cut smalti — irregular on purpose so the fractured surfaces catch light differently as the day moves. Jane Stanford rejected the first design (a "Last Judgment" scene) and demanded women appear equally among the 47 figures. Historian Richard Joncas says it doesn\'t actually depict the Sermon on the Mount despite the popular name — he calls it simply "an indefinite biblical scene." Twelve men in Venice spent two years assembling it.',
      contextualPhoto: null,
      suggestedNext: {
        pinId: 'narthex-floor',
        teaser:
          'Before you step inside, look down — there\'s a mosaic beneath your feet that introduces four symbols you\'ll see everywhere in this church.',
      },
    },
    observationHints: {
      who: {
        lookAt: 'the stone plaque on the facade, below the mosaic',
        clue: 'The plaque names Jane Lathrop Stanford as the builder — "erected by Jane Lathrop Stanford to the glory of God and in loving memory of her husband Leland Stanford." This wasn\'t a committee or a university decision. One woman built this church.',
      },
      why: {
        lookAt: 'the inscription on the facade plaque — read the exact words carved into the stone',
        clue: '"To the glory of God and in loving memory of her husband." Grief and faith, in one sentence. The church exists because the Stanfords lost their only son in 1884, then Leland Sr. died in 1893. Jane Stanford once said: "While my whole heart is in the university, my soul is in that church."',
      },
      when: {
        lookAt: 'where the church meets the Quad arcades on either side — the covered walkways connecting it to the academic buildings',
        clue: 'The same sandstone, the same architects (Shepley, Rutan, and Coolidge), the same era. The university opened in 1891, and the church was dedicated in 1903. They were designed as one continuous system — the sacred joined to the scholarly on purpose.',
      },
      what: {
        lookAt: 'the full mosaic from a distance — the scale, the shimmer, the 47 figures',
        clue: 'At the time of completion, this was the largest mosaic in America: 84 feet wide, 30 feet tall. Made of hand-cut smalti glass in the Salviati studios in Venice — the same firm that restored St. Mark\'s Basilica. Twelve men spent two years assembling it.',
      },
      how: {
        lookAt: 'the surface of the mosaic closely, if you can — notice the tiny individual pieces of glass',
        clue: 'Each piece (tessera) is roughly the size of a sugar cube, hand-cut from a palette of over 20,000 shades. The Salviati artists glued pieces face-down onto paper in Venice, shipped coded sections to California, then pressed them into wet mortar on site and soaked the paper off.',
      },
    },
    tags: ['mosaic', 'Salviati', 'Jane Stanford', 'facade'],
    era: '1900–1905',
    databaseEntryIds: ['3.1'],
  },
  {
    id: 'narthex-floor',
    title: 'The Narthex Floor',
    location: {
      lat: 37.42712,
      lng: -122.17015,
      physicalArea: 'narthex',
    },
    photo: {
      url: '',
      caption: 'The mosaic floor of the narthex — the Lamb of God surrounded by the four evangelists.',
      credit: '',
    },
    inquiry: {
      question:
        'Look down at the floor beneath your feet. You\'ll see a lamb at the center surrounded by four winged figures. Can you identify what animal each one is? Discuss what they might represent.',
      answer:
        'You\'re standing on the symbols of the four gospel writers: Matthew (winged angel), Mark (winged lion), Luke (the ox), and John (the eagle). These four will follow you through the entire church — in mosaic, glass, and stone. Now look up: the Latin above the side doors reads "Domus Dei Locus Orationis" (House of God, place of prayer) and "Domus Dei Aula Coeli" (House of God, forecourt of heaven). Notice the bronze doors — angels again. They\'re everywhere in this building.',
      contextualPhoto: null,
      suggestedNext: {
        pinId: 'pendentive-angels',
        teaser:
          'Walk into the nave and look up at the dome. Four enormous angels are holding it up — each one 42 feet from wingtip to wingtip.',
      },
    },
    observationHints: {
      what: {
        lookAt: 'the four winged figures surrounding the lamb in the floor mosaic',
        clue: 'These are the symbols of the four gospel writers — Matthew (angel), Mark (lion), Luke (ox), John (eagle). They\'re a key to reading the rest of the church: these same four symbols appear again and again in the mosaics, windows, and carvings throughout the building.',
      },
      where: {
        lookAt: 'the Latin inscriptions above the two side doors of the narthex',
        clue: '"Domus Dei Locus Orationis" (House of God, place of prayer) and "Domus Dei Aula Coeli" (House of God, forecourt of heaven). You are standing in the narthex — the vestibule, the threshold between the outside world and the sacred interior. The floor mosaic marks the transition.',
      },
      why: {
        lookAt: 'the bronze entrance doors — look at the figures on them',
        clue: 'Angels again. They\'re on the doors, in the floor, on the walls, in the glass, on the pendentives. Angels are the dominant motif of the entire church — a recurring symbol of comfort. Jane Stanford was decorating a memorial to the people she had lost.',
      },
      how: {
        lookAt: 'the floor mosaic closely — notice how it\'s made differently from the wall mosaics',
        clue: 'Floor mosaics must withstand foot traffic, so the tesserae are set deeper into mortar and the surface is ground smoother than wall mosaics. The same Salviati firm made both, but the techniques differ based on where the mosaic lives.',
      },
    },
    tags: ['mosaic', 'narthex', 'symbolism', 'evangelists'],
    era: '1900–1905',
    databaseEntryIds: ['3.6'],
  },
  {
    id: 'pendentive-angels',
    title: 'The Pendentive Angels',
    location: {
      lat: 37.42700,
      lng: -122.17015,
      physicalArea: 'crossing',
    },
    photo: {
      url: '',
      caption: 'One of the four archangels on the pendentives — each spans 42 feet from wingtip to wingtip.',
      credit: '',
    },
    inquiry: {
      question:
        'Stand at the center of the church and look straight up. Four enormous angels fill the curved triangles holding up the dome. One of them is looking down at you — can you find which one?',
      answer:
        'The downcast eyes belong to Uriel. His companions are Michael, Gabriel, and Raphael — each spanning 42 feet of hand-cut Venetian glass. They survived the 1906 earthquake, but in 1989 the crossing buckled. An 8-foot section of one angel\'s wing fell 70 feet to the floor. Pieces were stolen by souvenir-hunters — then returned anonymously. Now look at the dome above them: those decorations look like mosaics but they\'re paint. Real mosaics would have been too heavy for the dome.',
      contextualPhoto: null,
      suggestedNext: {
        pinId: 'chancel-last-supper',
        teaser:
          'Walk toward the altar. The mosaic behind it reproduces a famous painting — but it\'s not the one most people think.',
      },
    },
    observationHints: {
      who: {
        lookAt: 'each of the four angels — try to find the one looking downward',
        clue: 'These are archangels from Hebrew tradition: Michael, Gabriel, Raphael, and Uriel. Uriel is the one with downcast eyes, looking toward you. They were designed by Professor Antonio Paoletti, the 66-year-old chief artist at the Salviati studios in Venice.',
      },
      what: {
        lookAt: 'the dome decorations above the angels — do they look like mosaics to you?',
        clue: 'They\'re actually paint, designed to resemble mosaic. Jane Stanford wanted real mosaic tiles on the dome, but the builders determined the weight would be too much. The dome\'s ivy band, Ten Commandments, and star of the Epiphany are all painted illusion.',
      },
      when: {
        lookAt: 'the crossing structure — the walls and arches supporting the dome around you',
        clue: 'This is the only part of the church NOT rebuilt after the 1906 earthquake. The angels survived 1906 because they\'re part of this crossing structure. But in 1989, it was this section — the original, unreinforced section — that buckled. The rest of the church, rebuilt in reinforced concrete after 1906, held firm.',
      },
      how: {
        lookAt: 'the curved triangular surfaces (pendentives) that the angels are painted on — notice how they transition from the square walls to the circular dome',
        clue: 'Pendentives are the engineering solution for placing a round dome on a square base. Each angel spans the full 42 feet of its pendentive. During the 1989 repair, workers lowered 5,000-pound steel columns through holes in the roof, setting them within a foot of the brittle mosaic to reinforce the walls.',
      },
      why: {
        lookAt: 'the scale of the angels compared to everything else in the church — they are by far the largest figures',
        clue: 'At 42 feet wingtip to wingtip, they dwarf every other figure in the building. They are guardians. After the 1989 earthquake, an 8-foot section of one angel\'s wing fell 70 feet. Mosaic fragments were stolen by souvenir-hunters — but later returned anonymously. Even thieves felt the pull of this place.',
      },
    },
    tags: ['mosaic', 'archangels', 'dome', 'earthquake'],
    era: '1900–1905',
    databaseEntryIds: ['3.4'],
  },
  {
    id: 'chancel-last-supper',
    title: 'The Chancel & Last Supper',
    location: {
      lat: 37.42688,
      lng: -122.17015,
      physicalArea: 'chancel',
    },
    photo: {
      url: '',
      caption: 'The chancel — Carrara marble altar and the Last Supper mosaic behind it.',
      credit: '',
    },
    inquiry: {
      question:
        'Look at the mosaic behind the altar. Most people assume it\'s based on Leonardo da Vinci\'s Last Supper. Compare what you see here to what you remember of Leonardo\'s version — what\'s different?',
      answer:
        'It\'s Cosimo Roselli\'s Last Supper from the Sistine Chapel — not Leonardo\'s. Jane Stanford got permission from Pope Leo XIII to reproduce it. Now look at the twelve golden niches around the lower walls. They hold candles, but they once held white marble statues of the apostles — all destroyed in 1906, "injured beyond repair," never replaced. Look up at the carved cherubs above the niches: according to local legend, each face is a portrait of a child who lived on campus during construction.',
      contextualPhoto: null,
      suggestedNext: {
        pinId: 'facade-mosaic',
        teaser:
          'Head back outside and look at the facade mosaic again — it looks completely different in afternoon light.',
      },
    },
    observationHints: {
      who: {
        lookAt: 'the carved cherub faces above the golden niches and on the column capitals',
        clue: 'According to local legend, each cherub face is a portrait of a real child — the children of faculty and staff who lived on campus during construction. Look closely: each face is different. Also find the brass lectern in the form of a reading angel — Jane Stanford brought it from Europe and dedicated it to her husband on the anniversary of his birth in 1902.',
      },
      what: {
        lookAt: 'the mosaic behind the altar — the Last Supper scene',
        clue: 'This is a reproduction of Cosimo Roselli\'s Last Supper from the Sistine Chapel — not Leonardo da Vinci\'s, despite what most people assume. Jane Stanford obtained permission from Pope Leo XIII to reproduce it. Compare it to Leonardo\'s in your mind: different composition, different arrangement of figures.',
      },
      when: {
        lookAt: 'the twelve golden niches around the lower chancel walls — notice what\'s in them now versus what the spaces were designed for',
        clue: 'Candles sit where white Carrara marble statues of the twelve apostles once stood. They were destroyed in the 1906 earthquake — "injured beyond repair" — and never replaced. The niches have been empty for over a century. The original church was dedicated in 1903; the earthquake struck just three years later.',
      },
      why: {
        lookAt: 'the raised tiled floor of the chancel — notice how it curves outward into the nave, approached by seven marble steps',
        clue: 'Everything in this space focuses attention toward the altar and the Last Supper behind it. The bands of prophets and angels on the walls all face inward. Willis L. Hall, writing in 1917, called this "artistic work of a kind seldom seen anywhere." Jane Stanford designed this as the spiritual heart of the university.',
      },
      how: {
        lookAt: 'the walls of the chancel — the host of angels and the band of prophets flanking each side',
        clue: 'Every surface is decorated. Jane Stanford had what one scholar called "a Victorian aversion to blank space." The mosaic artists in Venice — working from Paoletti\'s watercolours — created each section on paper, shipped coded pieces across the Atlantic, then pressed them into wet mortar on site.',
      },
    },
    tags: ['mosaic', 'chancel', 'Last Supper', 'earthquake', 'absence'],
    era: '1900–1905',
    databaseEntryIds: ['3.5'],
  },
];
