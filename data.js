// ===== Static game data: board spaces, chance/community chest decks =====

const COLOR = {
  BROWN: '#955436',
  LIGHTBLUE: '#aae0fa',
  PINK: '#d93a96',
  ORANGE: '#f7941d',
  RED: '#ed1b24',
  YELLOW: '#fef200',
  GREEN: '#1fb25a',
  DARKBLUE: '#0072bb',
  RAIL: '#222222',
  UTIL: '#888888',
};

// type: 'go' | 'property' | 'railroad' | 'utility' | 'tax' | 'chance' | 'chest' | 'jail' | 'freeparking' | 'gotojail'
const BOARD = [
  { i: 0, name: 'GO', type: 'go' },
  { i: 1, name: 'Mediterranean Avenue', type: 'property', color: COLOR.BROWN, price: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50, mortgage: 30 },
  { i: 2, name: 'Community Chest', type: 'chest' },
  { i: 3, name: 'Baltic Avenue', type: 'property', color: COLOR.BROWN, price: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, mortgage: 30 },
  { i: 4, name: 'Income Tax', type: 'tax', amount: 200 },
  { i: 5, name: 'Reading Railroad', type: 'railroad', price: 200, mortgage: 100 },
  { i: 6, name: 'Oriental Avenue', type: 'property', color: COLOR.LIGHTBLUE, price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgage: 50 },
  { i: 7, name: 'Chance', type: 'chance' },
  { i: 8, name: 'Vermont Avenue', type: 'property', color: COLOR.LIGHTBLUE, price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgage: 50 },
  { i: 9, name: 'Connecticut Avenue', type: 'property', color: COLOR.LIGHTBLUE, price: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50, mortgage: 60 },
  { i: 10, name: 'Jail', type: 'jail' },
  { i: 11, name: 'St. Charles Place', type: 'property', color: COLOR.PINK, price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgage: 70 },
  { i: 12, name: 'Electric Company', type: 'utility', price: 150, mortgage: 75 },
  { i: 13, name: 'States Avenue', type: 'property', color: COLOR.PINK, price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgage: 70 },
  { i: 14, name: 'Virginia Avenue', type: 'property', color: COLOR.PINK, price: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100, mortgage: 80 },
  { i: 15, name: 'Pennsylvania Railroad', type: 'railroad', price: 200, mortgage: 100 },
  { i: 16, name: 'St. James Place', type: 'property', color: COLOR.ORANGE, price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgage: 90 },
  { i: 17, name: 'Community Chest', type: 'chest' },
  { i: 18, name: 'Tennessee Avenue', type: 'property', color: COLOR.ORANGE, price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgage: 90 },
  { i: 19, name: 'New York Avenue', type: 'property', color: COLOR.ORANGE, price: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, mortgage: 100 },
  { i: 20, name: 'Free Parking', type: 'freeparking' },
  { i: 21, name: 'Kentucky Avenue', type: 'property', color: COLOR.RED, price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110 },
  { i: 22, name: 'Chance', type: 'chance' },
  { i: 23, name: 'Indiana Avenue', type: 'property', color: COLOR.RED, price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110 },
  { i: 24, name: 'Illinois Avenue', type: 'property', color: COLOR.RED, price: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, mortgage: 120 },
  { i: 25, name: 'B&O Railroad', type: 'railroad', price: 200, mortgage: 100 },
  { i: 26, name: 'Atlantic Avenue', type: 'property', color: COLOR.YELLOW, price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgage: 130 },
  { i: 27, name: 'Ventnor Avenue', type: 'property', color: COLOR.YELLOW, price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgage: 130 },
  { i: 28, name: 'Water Works', type: 'utility', price: 150, mortgage: 75 },
  { i: 29, name: 'Marvin Gardens', type: 'property', color: COLOR.YELLOW, price: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150, mortgage: 140 },
  { i: 30, name: 'Go To Jail', type: 'gotojail' },
  { i: 31, name: 'Pacific Avenue', type: 'property', color: COLOR.GREEN, price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgage: 150 },
  { i: 32, name: 'North Carolina Avenue', type: 'property', color: COLOR.GREEN, price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgage: 150 },
  { i: 33, name: 'Community Chest', type: 'chest' },
  { i: 34, name: 'Pennsylvania Avenue', type: 'property', color: COLOR.GREEN, price: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, mortgage: 160 },
  { i: 35, name: 'Short Line', type: 'railroad', price: 200, mortgage: 100 },
  { i: 36, name: 'Chance', type: 'chance' },
  { i: 37, name: 'Park Place', type: 'property', color: COLOR.DARKBLUE, price: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, mortgage: 175 },
  { i: 38, name: 'Luxury Tax', type: 'tax', amount: 100 },
  { i: 39, name: 'Boardwalk', type: 'property', color: COLOR.DARKBLUE, price: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, mortgage: 200 },
];

const RAILROAD_RENTS = [25, 50, 100, 200];

// Card effect types handled in engine.js:
// move(pos), moveRelative(delta), advanceTo(name), money(amount), collectFromEach(amount),
// payEach(amount), jail, jailFree, repair(perHouse, perHotel), nearestRailroad, nearestUtility
const CHANCE_CARDS = [
  { text: 'Advance to GO (Collect $200)', type: 'move', pos: 0 },
  { text: 'Advance to Illinois Avenue. If you pass GO, collect $200', type: 'move', pos: 24 },
  { text: 'Advance to St. Charles Place. If you pass GO, collect $200', type: 'move', pos: 11 },
  { text: 'Advance to the nearest Utility. If unowned, you may buy it from the Bank. If owned, throw dice and pay owner 10 times the amount thrown.', type: 'nearestUtility' },
  { text: 'Advance to the nearest Railroad. If unowned, you may buy it from the Bank. If owned, pay owner twice the rental.', type: 'nearestRailroad' },
  { text: 'Advance to the nearest Railroad. If unowned, you may buy it from the Bank. If owned, pay owner twice the rental.', type: 'nearestRailroad' },
  { text: 'Bank pays you dividend of $50', type: 'money', amount: 50 },
  { text: 'Get Out of Jail Free', type: 'jailFree' },
  { text: 'Go Back 3 Spaces', type: 'moveRelative', delta: -3 },
  { text: 'Go to Jail. Go directly to Jail, do not pass GO, do not collect $200', type: 'jail' },
  { text: 'Make general repairs on all your property: $25 per house, $100 per hotel', type: 'repair', perHouse: 25, perHotel: 100 },
  { text: 'Pay poor tax of $15', type: 'money', amount: -15 },
  { text: 'Take a trip to Reading Railroad. If you pass GO, collect $200', type: 'move', pos: 5 },
  { text: 'Advance to Boardwalk', type: 'move', pos: 39 },
  { text: 'You have been elected Chairman of the Board. Pay each player $50', type: 'payEach', amount: 50 },
  { text: 'Your building loan matures. Collect $150', type: 'money', amount: 150 },
  { text: 'You have won a crossword competition. Collect $100', type: 'money', amount: 100 },
];

const CHEST_CARDS = [
  { text: 'Advance to GO (Collect $200)', type: 'move', pos: 0 },
  { text: 'Bank error in your favor. Collect $200', type: 'money', amount: 200 },
  { text: "Doctor's fees. Pay $50", type: 'money', amount: -50 },
  { text: 'From sale of stock you get $50', type: 'money', amount: 50 },
  { text: 'Get Out of Jail Free', type: 'jailFree' },
  { text: 'Go to Jail. Go directly to Jail, do not pass GO, do not collect $200', type: 'jail' },
  { text: 'Grand Opera Night. Collect $50 from every player for opening night seats', type: 'collectFromEach', amount: 50 },
  { text: 'Holiday Fund matures. Receive $100', type: 'money', amount: 100 },
  { text: 'Income tax refund. Collect $20', type: 'money', amount: 20 },
  { text: 'It is your birthday. Collect $10 from every player', type: 'collectFromEach', amount: 10 },
  { text: 'Life insurance matures. Collect $100', type: 'money', amount: 100 },
  { text: 'Pay hospital fees of $100', type: 'money', amount: -100 },
  { text: 'Pay school fees of $150', type: 'money', amount: -150 },
  { text: 'Receive $25 consultancy fee', type: 'money', amount: 25 },
  { text: 'You are assessed for street repair: $40 per house, $115 per hotel', type: 'repair', perHouse: 40, perHotel: 115 },
  { text: 'You have won second prize in a beauty contest. Collect $10', type: 'money', amount: 10 },
  { text: 'You inherit $100', type: 'money', amount: 100 },
];

const TOKENS = ['🚗', '🎩', '🐕', '🚢', '👞', '🐈', '🍢', '👞', '🧵', '🛞'];
// dedupe-friendly emoji token set
const PLAYER_TOKENS = ['🚗', '🎩', '🐕', '🚢', '👞', '🐈', '🍢', '💍'];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
