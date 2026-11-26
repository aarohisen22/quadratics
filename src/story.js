// ============================================================
//  THE STORY: every line of words in Story mode is in this file.
//  Change any text between the quotes, save, and refresh the page.
//  (Keep the quotes and commas. Names in {curly brackets} are filled in by the game.)
// ============================================================
//
// Who can talk (the picture next to the words is a circle with these letters and colors).
export const SPEAKERS = {
  keeper:  { name: 'Shrine keeper', mark: '神', color: '#e8c45a' },
  anay:    { name: 'Anay',          mark: 'A',  color: '#c0272d' },
  arha:    { name: 'Arha',          mark: 'A',  color: '#2f7be0' },
  kage:    { name: 'Kage',          mark: '影', color: '#7a6a8a' },
  tetsu:   { name: 'Captain Tetsu', mark: '鉄', color: '#8a7a4a' },
  ryu:     { name: 'Lord Ryū',      mark: '竜', color: '#a03a2a' },
  daimyo:  { name: 'The Daimyo',    mark: '大', color: '#c08a2a' },
  shogun:  { name: 'The Shogun',    mark: '将', color: '#d0302a' },
};

// The opening film. Each shot: where the camera looks (a place), how long, and the words on screen.
// Places: 'stone' (the Quadratic Stone at the shrine), 'castle', 'bamboo', 'cedar', 'village', 'maple', 'torii'.
export const INTRO = [
  { place: 'stone', seconds: 7, sky: 'dusk',
    text: 'Deep in the forest, on shrine hill, the Quadratic Stone glowed. Its four pieces kept the whole forest alive.' },
  { place: 'castle', seconds: 6, sky: 'dusk',
    text: 'But in his castle in the north, the Shogun wanted the Stone\'s power for himself.' },
  { place: 'stone', seconds: 7, sky: 'storm', event: 'steal',
    text: 'One stormy night his warriors crept up the hill, stole the Stone, and broke it into four pieces.' },
  { place: 'bamboo', seconds: 4.5, sky: 'dusk',
    text: 'He gave one piece to each of his captains: the ronin of the bamboo grove…' },
  { place: 'cedar', seconds: 4.5, sky: 'dusk',
    text: '…the ashigaru of the cedar forest…' },
  { place: 'village', seconds: 4.5, sky: 'dusk',
    text: '…the samurai who took over the village…' },
  { place: 'maple', seconds: 4.5, sky: 'dusk',
    text: '…and the Daimyo, his greatest lord, in the maple valley.' },
  { place: 'torii', seconds: 7, sky: 'rain',
    text: 'Without the Stone, the forest began to fade. Only two ninjas could bring it back: the brothers {anay} and {arha}.' },
];

// The five chapters, in order. Each one happens in one area of the map.
//   waves: how many warriors in each wave (round 1); kinds: which ranks come and how often
//   leader: the captain who holds the piece (kind: a rank, or 'daimyo' / 'shogun' for the big bosses)
//   start: what is said before setting off; arrive: a message when you get there;
//   win: what is said after the leader is beaten and the piece (or the victory) is yours.
export const CHAPTERS = [
  {
    area: 'bamboo', title: 'The Bamboo Grove', jp: '第一章 竹林', sky: 'clearing',
    waves: [4, 6], kinds: { ronin: 1 },
    leader: { kind: 'ronin', speaker: 'kage', name: '影  Kage, the ronin captain' },
    start: [
      ['keeper', '{anay}! {arha}! The Shogun\'s men have broken the Quadratic Stone. The forest is already losing its colour.'],
      ['anay', 'Then we\'ll get it back. All four pieces.'],
      ['arha', 'Where do we start?'],
      ['keeper', 'In the bamboo grove, to the south-west. Kage the ronin captain holds the first piece. Follow the golden light.'],
    ],
    arrive: 'The bamboo grove. Ronin hide between the stalks… get ready!',
    leaderLine: ['kage', 'Ninjas? You want this little stone? Come and take it!'],
    win: [
      ['arha', 'Got it! The first piece!'],
      ['keeper', 'Well done! I have put it back in its place. Next, the cedar forest to the west. Captain Tetsu and his ashigaru guard the second piece.'],
    ],
  },
  {
    area: 'cedar', title: 'The Cedar Forest', jp: '第二章 杉の森', sky: 'rain',
    waves: [5, 7], kinds: { yari: 0.5, yumi: 0.3, teppo: 0.2 },
    leader: { kind: 'yari', speaker: 'tetsu', name: '鉄  Captain Tetsu' },
    start: [
      ['keeper', 'The ashigaru have spears, bows and guns. Watch for the red lines: that is where they are aiming.'],
      ['anay', 'Spears, bows, guns… and us.'],
    ],
    arrive: 'The cedar forest. Ashigaru everywhere: spears, bows and guns!',
    leaderLine: ['tetsu', 'Line up, men! No ninja gets past Captain Tetsu!'],
    win: [
      ['anay', 'Two pieces! Halfway there.'],
      ['keeper', 'The forest is breathing again. But the village to the south-east is in trouble: Lord Ryū\'s samurai have taken it over. He has the third piece.'],
    ],
  },
  {
    area: 'village', title: 'The Village', jp: '第三章 村', sky: 'golden',
    waves: [5, 7], kinds: { samurai: 0.6, yumi: 0.2, teppo: 0.2 },
    leader: { kind: 'samurai', speaker: 'ryu', name: '竜  Lord Ryū' },
    start: [
      ['keeper', 'The villagers have run away to hide. Free their village and they can come home.'],
      ['arha', 'Real samurai this time. Let\'s be careful.'],
    ],
    arrive: 'The village. Samurai on every street!',
    leaderLine: ['ryu', 'This village belongs to the Shogun now. Leave, or fall!'],
    win: [
      ['arha', 'The village is free! And that\'s the third piece.'],
      ['keeper', 'Only one left, and it is the hardest. The Daimyo himself guards it, in the maple valley to the north-east.'],
    ],
  },
  {
    area: 'maple', title: 'The Maple Valley', jp: '第四章 紅葉谷', sky: 'golden',
    waves: [5, 6], kinds: { hatamoto: 0.6, samurai: 0.2, yari: 0.2 },
    leader: { kind: 'daimyo', speaker: 'daimyo' },
    start: [
      ['keeper', 'The Daimyo calls down arrows with his fan and brings his hatamoto bodyguards. Keep moving!'],
      ['anay', 'Last piece. Let\'s finish this.'],
    ],
    arrive: 'The maple valley. The Daimyo\'s hatamoto are waiting…',
    leaderLine: ['daimyo', 'You beat my captains. You will not beat me!'],
    win: [
      ['anay', 'All four pieces!'],
      ['keeper', 'The Stone is whole… but it will not shine. The Shogun has put a curse on it. Only beating him in his own castle will break it.'],
      ['arha', 'Then we go to the castle.'],
    ],
  },
  {
    area: 'castle', title: 'The Shogun\'s Castle', jp: '第五章 城', sky: 'storm',
    waves: [6, 8], kinds: { hatamoto: 0.5, samurai: 0.3, teppo: 0.2 },
    leader: { kind: 'shogun', speaker: 'shogun' },
    start: [
      ['keeper', 'The castle is in the north, across the moat. Be brave, both of you.'],
      ['arha', 'Together?'],
      ['anay', 'Together.'],
    ],
    arrive: 'The Shogun\'s castle. This is it!',
    leaderLine: ['shogun', 'So, the little ninjas have come all the way to my castle. The Stone is mine!'],
    win: [],   // the ending film comes next
  },
];

// The ending film, after the Shogun is beaten.
export const ENDING = [
  { place: 'castle', seconds: 6, sky: 'clearing',
    text: 'The Shogun was beaten, and his curse broke like thunder.' },
  { place: 'stone', seconds: 8, sky: 'golden', event: 'shine',
    text: 'On shrine hill, the Quadratic Stone shone again, brighter than ever before.' },
  { place: 'torii', seconds: 8, sky: 'golden',
    text: 'The forest grew green, the villagers came home, and everyone remembered the two brothers who saved it: {anay} and {arha}.' },
];

// The names that roll up at the end. Put your own names here!
export const CREDITS = [
  ['QUADRATICS', ''],
  ['Story, ideas and testing', 'The Quadratics team'],
  ['Starring', '{anay} and {arha}'],
  ['Villains', 'Kage · Captain Tetsu · Lord Ryū · the Daimyo · the Shogun'],
  ['Made with', 'three.js and Claude'],
  ['Thank you for playing!', ''],
];

// Messages shown during play.
export const MESSAGES = {
  goTo: 'Go to {place}',
  arrived: 'Beat the warriors of {place}',
  waveDone: 'Wave beaten! More are coming…',
  leaderComing: 'Their leader is coming!',
  pickUp: 'Pick up the piece of the Stone!',
  gotPiece: 'Piece {n} of 4',
  chapterDone: 'Chapter complete!',
  round2: 'Round 2: every warrior is tougher now.',
  defeated: 'Try the chapter again? Your pieces are safe.',
};
