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
    tags: ['mosaic', 'chancel', 'Last Supper', 'earthquake', 'absence'],
    era: '1900–1905',
    databaseEntryIds: ['3.5'],
  },
];
