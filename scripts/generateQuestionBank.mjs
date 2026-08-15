import fs from 'node:fs'
import path from 'node:path'

const take = (list, start, size = 4) => {
  if (list.length <= size) return list.slice()
  return Array.from({ length: size }, (_, i) => list[(start + i) % list.length])
}

const groups = [
  { name: 'BLACKPINK', members: ['Jisoo', 'Jennie', 'Rosé', 'Lisa'], songs: ['Boombayah', 'DDU-DU DDU-DU', 'Kill This Love', 'How You Like That', 'Lovesick Girls', 'Pink Venom', 'Shut Down'], albums: ['Square Up', 'Kill This Love', 'The Album', 'Born Pink'] },
  { name: 'BTS', members: ['RM', 'Jin', 'SUGA', 'j-hope', 'Jimin', 'V', 'Jungkook'], songs: ['Spring Day', 'DNA', 'Fake Love', 'Boy With Luv', 'Dynamite', 'Butter', 'Life Goes On'], albums: ['Wings', 'Love Yourself: Tear', 'Map of the Soul: 7', 'BE'] },
  { name: 'TWICE', members: ['Nayeon', 'Jeongyeon', 'Momo', 'Sana', 'Jihyo', 'Mina', 'Dahyun', 'Chaeyoung', 'Tzuyu'], songs: ['Cheer Up', 'TT', 'Likey', 'What is Love?', 'FANCY', 'Feel Special', 'I CAN\'T STOP ME'], albums: ['Twicetagram', 'Feel Special', 'Eyes Wide Open', 'Formula of Love: O+T=<3'] },
  { name: 'SEVENTEEN', members: ['S.Coups', 'Jeonghan', 'Joshua', 'Jun', 'Hoshi', 'Wonwoo', 'Woozi', 'DK', 'Mingyu', 'The8', 'Seungkwan', 'Vernon', 'Dino'], songs: ['Don\'t Wanna Cry', 'Thanks', 'Home', 'God\'s Menu', 'Hot', 'Super', 'God of Music'], albums: ['You Make My Day', 'An Ode', 'Attacca', 'FML'] },
  { name: 'aespa', members: ['Karina', 'Giselle', 'Winter', 'Ningning'], songs: ['Black Mamba', 'Next Level', 'Savage', 'Spicy', 'Drama', 'Supernova', 'Whiplash'], albums: ['Savage', 'Girls', 'My World', 'Armageddon'] },
  { name: 'IVE', members: ['Yujin', 'Gaeul', 'Rei', 'Wonyoung', 'Liz', 'Leeseo'], songs: ['ELEVEN', 'LOVE DIVE', 'After LIKE', 'I AM', 'Either Way', 'HEYA', 'Accendio'], albums: ['I\'ve IVE', 'I\'ve Mine', 'IVE SWITCH', 'IVE EMPATHY'] },
  { name: 'NewJeans', members: ['Minji', 'Hanni', 'Danielle', 'Haerin', 'Hyein'], songs: ['Attention', 'Hype Boy', 'Ditto', 'OMG', 'Super Shy', 'How Sweet', 'Right Now'], albums: ['New Jeans', 'Get Up', 'How Sweet', 'Supernatural'] },
  { name: 'Stray Kids', members: ['Bang Chan', 'Lee Know', 'Changbin', 'Hyunjin', 'HAN', 'Felix', 'Seungmin', 'I.N'], songs: ['MIROH', 'Back Door', 'Thunderous', 'MANIAC', 'CASE 143', 'S-Class', 'Chk Chk Boom'], albums: ['GO生', 'NOEASY', 'ODDINARY', '★★★★★ 5-STAR'] },
  { name: 'EXO', members: ['Suho', 'Xiumin', 'Lay', 'Baekhyun', 'Chen', 'Chanyeol', 'D.O.', 'Kai', 'Sehun'], songs: ['Growl', 'Call Me Baby', 'Love Shot', 'Tempo', 'Ko Ko Bop', 'Obsession', 'Cream Soda'], albums: ['XOXO', 'EXODUS', 'THE WAR', 'EXIST'] },
  { name: 'Red Velvet', members: ['Irene', 'Seulgi', 'Wendy', 'Joy', 'Yeri'], songs: ['Red Flavor', 'Peek-A-Boo', 'Bad Boy', 'Psycho', 'Queendom', 'Feel My Rhythm', 'Cosmic'], albums: ['The Red', 'Perfect Velvet', 'The ReVe Festival', 'Cosmic'] },
  { name: '少女时代', members: ['Taeyeon', 'Sunny', 'Tiffany', 'Hyoyeon', 'Yuri', 'Sooyoung', 'Yoona', 'Seohyun'], songs: ['Into the New World', 'Gee', 'Genie', 'Oh!', 'The Boys', 'I Got a Boy', 'Forever 1'], albums: ['Gee', 'The Boys', 'I Got a Boy', 'Holiday Night'] },
  { name: 'IU', members: ['IU'], songs: ['Good Day', 'Through the Night', 'Palette', 'Blueming', 'Celebrity', 'Lilac', 'Love Wins All'], albums: ['Last Fantasy', 'Modern Times', 'Palette', 'Lilac'] },
  { name: 'ENHYPEN', members: ['Heeseung', 'Jay', 'Jake', 'Sunghoon', 'Sunoo', 'Jungwon', 'Ni-ki'], songs: ['Given-Taken', 'Drunk-Dazed', 'Tamed-Dashed', 'Polaroid Love', 'Bite Me', 'Sweet Venom', 'No Doubt'], albums: ['BORDER : DAY ONE', 'DIMENSION : DILEMMA', 'MANIFESTO : DAY 1', 'ROMANCE : UNTOLD'] },
  { name: 'TXT', members: ['Yeonjun', 'Soobin', 'Beomgyu', 'Taehyun', 'Huening Kai'], songs: ['CROWN', '9 and Three Quarters (Run Away)', '0X1=LOVESONG', 'Good Boy Gone Bad', 'Sugar Rush Ride', 'Chasing That Feeling', 'Over The Moon'], albums: ['The Dream Chapter: MAGIC', 'The Chaos Chapter: FREEZE', 'minisode 2: Thursday\'s Child', 'The Name Chapter: TEMPTATION'] },
  { name: 'SHINee', members: ['Onew', 'Jonghyun', 'Key', 'Minho', 'Taemin'], songs: ['Replay', 'Lucifer', 'Sherlock', 'Dream Girl', 'View', 'Everybody', 'Don\'t Call Me'], albums: ['The SHINee World', 'Odd', 'The Story of Light', 'HARD'] },
  { name: 'NCT 127', members: ['Johnny', 'Taeyong', 'Yuta', 'Doyoung', 'Jaehyun', 'Jungwoo', 'Mark', 'Haechan'], songs: ['Cherry Bomb', 'Regular', 'Kick It', 'Sticker', '2 Baddies', 'Fact Check', 'Walk'], albums: ['Regular-Irregular', 'Neo Zone', 'Sticker', 'Fact Check'] },
  { name: 'NCT DREAM', members: ['Mark', 'Renjun', 'Jeno', 'Haechan', 'Jaemin', 'Chenle', 'Jisung'], songs: ['Chewing Gum', 'We Young', 'BOOM', 'Hot Sauce', 'Hello Future', 'Candy', 'Smoothie'], albums: ['Hot Sauce', 'Glitch Mode', 'ISTJ', 'DREAMSCAPE'] },
  { name: 'ASTRO', members: ['MJ', 'Jinjin', 'Cha Eunwoo', 'Moonbin', 'Rocky', 'Sanha'], songs: ['Hide & Seek', 'Breathless', 'Baby', 'Crazy Sexy Cool', 'All Night', 'Blue Flame', 'After Midnight'], albums: ['Spring Up', 'All Light', 'Blue Flame', 'Switch On'] },
  { name: 'LE SSERAFIM', members: ['Chaewon', 'Sakura', 'Yunjin', 'Kazuha', 'Eunchae'], songs: ['FEARLESS', 'ANTIFRAGILE', 'UNFORGIVEN', 'EASY', 'Smart', 'CRAZY', 'HOT'], albums: ['FEARLESS', 'ANTIFRAGILE', 'UNFORGIVEN', 'EASY'] },
  { name: 'GOT7', members: ['JB', 'Mark', 'Jackson', 'Jinyoung', 'Youngjae', 'BamBam', 'Yugyeom'], songs: ['Just Right', 'If You Do', 'Hard Carry', 'Never Ever', 'Lullaby', 'You Calling My Name', 'NANANA'], albums: ['Got It?', 'Flight Log: Turbulence', 'Eyes On You', 'Dye'] },
  { name: 'MONSTA X', members: ['Shownu', 'Minhyuk', 'Kihyun', 'Hyungwon', 'Jooheon', 'I.M'], songs: ['Trespass', 'Beautiful', 'Dramarama', 'Shoot Out', 'Alligator', 'Love Killa', 'Beautiful Liar'], albums: ['The Clan Pt. 2.5', 'Take.1 Are You There?', 'Fatal Love', 'REASON'] },
  { name: 'THE BOYZ', members: ['Sangyeon', 'Jacob', 'Younghoon', 'Hyunjae', 'Juyeon', 'Kevin', 'New', 'Q', 'Ju Haknyeon', 'Sunwoo', 'Eric'], songs: ['Boy', 'No Air', 'Bloom Bloom', 'The Stealer', 'Maverick', 'ROAR', 'TRIGGER'], albums: ['The Start', 'Reveal', 'THRILL-ING', 'PHANTASY'] },
  { name: 'ATEEZ', members: ['Hongjoong', 'Seonghwa', 'Yunho', 'Yeosang', 'San', 'Mingi', 'Wooyoung', 'Jongho'], songs: ['Pirate King', 'WAVE', 'Answer', 'Fireworks (I\'m The One)', 'Guerrilla', 'BOUNCY', 'WORK'], albums: ['Treasure EP.1', 'ZERO : FEVER Part.1', 'THE WORLD EP.FIN : WILL', 'GOLDEN HOUR : Part.1'] },
  { name: 'ITZY', members: ['Yeji', 'Lia', 'Ryujin', 'Chaeryeong', 'Yuna'], songs: ['DALLA DALLA', 'WANNABE', 'Not Shy', 'In the morning', 'LOCO', 'SNEAKERS', 'CAKE'], albums: ['IT\'z ICY', 'GUESS WHO', 'CHECKMATE', 'KILL MY DOUBT'] },
  { name: '(G)I-DLE', members: ['Miyeon', 'Minnie', 'Soyeon', 'Yuqi', 'Shuhua'], songs: ['LATATA', 'Oh my god', 'Tomboy', 'Nxde', 'Queencard', 'Super Lady', 'Klaxon'], albums: ['I am', 'I Trust', 'I Never Die', '2'] },
  { name: 'EVERGLOW', members: ['E:U', 'Sihyeon', 'Mia', 'Onda', 'Aisha', 'Yiren'], songs: ['Bon Bon Chocolat', 'Adios', 'Dun Dun', 'La Di Da', 'First', 'Pirate', 'SLAY'], albums: ['Arrival of EVERGLOW', 'HUSH', '-77.82X-78.29', 'Return of the Girl'] },
  { name: 'RIIZE', members: ['Shotaro', 'Eunseok', 'Sungchan', 'Wonbin', 'Sohee', 'Anton'], songs: ['Get A Guitar', 'Memories', 'Love 119', 'Talk Saxy', 'Impossible', 'Boom Boom Bass', 'Lucky'], albums: ['Get A Guitar', 'RIIZING', 'RIIZING : Epilogue', 'ODYSSEY'] },
  { name: 'BOYNEXTDOOR', members: ['Sungho', 'Riwoo', 'Jaehyun', 'Taesan', 'Leehan', 'Woonhak'], songs: ['But Sometimes', 'Serenade', 'Earth, Wind & Fire', 'Nice Guy', 'IF I SAY, I LOVE YOU', 'One and Only'], albums: ['WHO!', 'HOW?', '19.99', 'WHY..'] },
  { name: 'Apink', members: ['Chorong', 'Bomi', 'Eunji', 'Namjoo', 'Hayoung'], songs: ['NoNoNo', 'Mr. Chu', 'LUV', 'I\'m so sick', '%%', 'Dumhdurum', 'Dilemma'], albums: ['Une Annee', 'Pink MEMORY', 'PERCENT', 'SELF'] },
  { name: 'fromis_9', members: ['Saerom', 'Hayoung', 'Jiwon', 'Jisun', 'Seoyeon', 'Chaeyoung', 'Nagyung', 'Jiheon'], songs: ['To Heart', 'LOVE BOMB', 'FUN!', 'WE GO', 'DM', 'Stay This Way', 'Supersonic'], albums: ['To. Heart', 'My Little Society', 'Midnight Guest', 'Unlock My World'] },
  { name: 'BABYMONSTER', members: ['Ruka', 'Pharita', 'Asa', 'Ahyeon', 'Rami', 'Rora', 'Chiquita'], songs: ['BATTER UP', 'Stuck In The Middle', 'SHEESH', 'LIKE THAT', 'CLIK CLAK', 'HOT SAUCE', 'WE GO UP'], albums: ['BATTER UP', 'BABYMONS7ER', 'DRIP', 'We Go Up'] },
  { name: 'ZEROBASEONE', members: ['Sung Hanbin', 'Zhang Hao', 'Kim Jiwoong', 'Seok Matthew', 'Kim Taerae', 'Ricky', 'Kim Gyuvin', 'Park Gunwook', 'Han Yujin'], songs: ['In Bloom', 'CRUSH', 'MELTING POINT', 'SWEAT', 'GOOD SO BAD', 'Doctor! Doctor!', 'BLUE'], albums: ['YOUTH IN THE SHADE', 'MELTING POINT', 'You had me at HELLO', 'BLUE PARADISE'] },
  { name: 'NMIXX', members: ['Lily', 'Haewon', 'Sullyoon', 'Bae', 'Jiwoo', 'Kyujin'], songs: ['O.O', 'DICE', 'Love Me Like This', 'Dash', 'See that?', 'Know About Me', 'High Horse'], albums: ['AD MARE', 'ENTWURF', 'expérgo', 'Fe3O4: BREAK'] },
  { name: 'TREASURE', members: ['Choi Hyunsuk', 'Jihoon', 'Yoshi', 'Junkyu', 'Yoon Jaehyuk', 'Asahi', 'Doyoung', 'Haruto', 'Park Jeongwoo', 'So Junghwan'], songs: ['BOY', 'I LOVE YOU', 'JIKJIN', 'HELLO', 'BONA BONA', 'KING KONG', 'LAST NIGHT'], albums: ['THE FIRST STEP: TREASURE EFFECT', 'THE SECOND STEP: CHAPTER ONE', 'THE SECOND STEP: CHAPTER TWO', 'REBOOT'] },
  { name: 'ILLIT', members: ['Yunah', 'Minju', 'Moka', 'Wonhee', 'Iroha'], songs: ['Magnetic', 'Lucky Girl Syndrome', 'Cherish (My Love)', 'Tick-Tack', 'Billyeoon Goyangi (Do the Dance)', 'jellyous'], albums: ['SUPER REAL ME', 'I\'LL LIKE YOU', 'bomb', 'Tick-Tack'] },
  { name: 'KISS OF LIFE', members: ['Julie', 'Natty', 'Belle', 'Haneul'], songs: ['Shhh', 'Ugly Heart', 'Midas Touch', 'Sticky', 'Igloo', 'k bye'], albums: ['Kiss of Life', 'Born to be XX', 'Lose Yourself', 'Midas Touch'] },
  { name: 'TWS', members: ['Shinyu', 'Dohoon', 'Youngjae', 'Hanjin', 'Jihoon', 'Kyungmin'], songs: ['Plot Twist', 'hey! hey!', 'If I\'m S', 'Last Festival', 'Countdown', 'BLAST'], albums: ['Sparkling Blue', 'SUMMER BEAT!', 'TRY WITH US', 'play hard'] },
  { name: 'STAYC', members: ['Sumin', 'Sieun', 'Isa', 'Seeun', 'Yoon', 'J'], songs: ['SO BAD', 'ASAP', 'STEREOTYPE', 'RUN2U', 'Beautiful Monster', 'Teddy Bear', 'Bubble'], albums: ['Star To A Young Culture', 'STEREOTYPE', 'YOUNG-LUV.COM', 'Metamorphic'] },
  { name: 'WayV', members: ['Kun', 'Ten', 'Winwin', 'Xiaojun', 'Hendery', 'Yangyang'], songs: ['Regular', 'Take Off', 'Kick Back', 'Love Talk', 'Phantom', 'On My Youth', 'Give Me That'], albums: ['Take Over The Moon', 'Kick Back', 'Phantom', 'Give Me That'] },
  { name: 'PLAVE', members: ['Yejun', 'Noah', 'Bamby', 'Eunho', 'Hamin'], songs: ['Wait For You', 'Why?', 'Way 4 Luv', 'Pump Up The Volume!', 'Mega Vice', 'Dash', 'From'], albums: ['Asterum', 'Asterum : 134-1', 'Caligo Pt.1', 'Pump Up The Volume!'] },
  { name: 'MEOVV', members: ['Sooin', 'Gawon', 'Anna', 'Narin', 'Ella'], songs: ['MEOW', 'HANDS UP', 'DROP TOP', 'TOXIC'], albums: ['MEOW', 'HANDS UP', 'MY EYES OPEN VVIDE', 'DROP TOP'] },
  { name: 'P1Harmony', members: ['Keeho', 'Theo', 'Jiung', 'Intak', 'Soul', 'Jongseob'], songs: ['Siren', '+82', 'Do It Like This', 'Jump', 'Sad Song', 'Pretty Boy', 'DUH!'], albums: ['DISHARMONY : STAND OUT', 'DISHARMONY : BREAK OUT', 'HARMONY : SET IN', 'Killin\' It'] },
  { name: 'Xdinary Heroes', members: ['Gunil', 'Jungsu', 'Gaon', 'O.de', 'Jun Han', 'Jooyeon'], songs: ['Happy Death Day', 'Test Me', 'Freakin\' Bad', 'Tight', 'Sweat', 'Night Before the End', 'Little Things'], albums: ['Hello, world!', 'Overload', 'Troubleshooting', 'LIVE and FALL'] },
  { name: 'DAY6', members: ['Sungjin', 'Young K', 'Wonpil', 'Dowoon'], songs: ['You Were Beautiful', 'I Like You', 'Time of Our Life', 'Zombie', 'Welcome to the Show', 'HAPPY', 'Maybe Tomorrow'], albums: ['Sunrise', 'Moonrise', 'The Book of Us : Gravity', 'Fourever'] },
  { name: 'MAMAMOO', members: ['Solar', 'Moonbyul', 'Wheein', 'Hwasa'], songs: ['You\'re the Best', 'Starry Night', 'HIP', 'gogobebe', 'Décalcomanie', 'Where Are We Now', 'I MISS YOU'], albums: ['Melting', 'Red Moon', 'Reality in BLACK', 'MIC ON'] },
  { name: 'Oh My Girl', members: ['Hyojung', 'Mimi', 'YooA', 'Seunghee', 'Yubin', 'Arin'], songs: ['Closer', 'Secret Garden', 'Nonstop', 'Dolphin', 'Dun Dun Dance', 'Real Love', 'Classified'], albums: ['WINDY DAY', 'Remember Me', 'NONSTOP', 'Real Love'] },
  { name: 'GFRIEND', members: ['Sowon', 'Yerin', 'Eunha', 'Yuju', 'SinB', 'Umji'], songs: ['Me Gustas Tu', 'Rough', 'Navillera', 'Time for the Moon Night', 'Sunrise', 'MAGO', 'Apple'], albums: ['LOL', 'The Awakening', 'Time for the Moon Night', '回:Walpurgis Night'] },
  { name: '2NE1', members: ['CL', 'Park Bom', 'Dara', 'Minzy'], songs: ['Fire', 'I Am The Best', 'Lonely', 'Ugly', 'Come Back Home', 'Gotta Be You', 'I Don\'t Care'], albums: ['To Anyone', '2NE1 2nd Mini Album', 'Crush', 'NOLZA'] },
  { name: 'BIGBANG', members: ['G-Dragon', 'T.O.P', 'Taeyang', 'Daesung'], songs: ['Haru Haru', 'Fantastic Baby', 'Bang Bang Bang', 'Loser', 'If You', 'FXXK IT', 'Still Life'], albums: ['MADE', 'ALIVE', 'Remember', 'Tonight'] },
  { name: 'iKON', members: ['Kim Jinhwan', 'Koo Junhoe', 'Song Yunhyeong', 'Bobby', 'Kim Donghyuk', 'Jung Chanwoo'], songs: ['LOVE SCENARIO', 'Killing Me', 'RHYTHM TA', 'Airplane', 'DUMB & DUMBER', 'B-DAY', 'Goodbye Road'], albums: ['Welcome Back', 'Return', 'I DECIDE', 'FLASHBACK'] },
  { name: 'WINNER', members: ['Yoon', 'Jinwoo', 'Seunghoon', 'Mino'], songs: ['EMPTY', 'REALLY REALLY', 'Love Me Love Me', 'AH YEAH', 'I LOVE U', 'MILLIONS'], albums: ['EXIT : E', 'FATE NUMBER FOR', 'EVERYD4Y', 'HOLIDAY'] },
  { name: 'NiziU', members: ['Mako', 'Rio', 'Maya', 'Riku', 'Ayaka', 'Mayuka', 'Rima', 'Miihi', 'Nina'], songs: ['Make you happy', 'Step and a step', 'Super Summer', 'CLAP CLAP', 'HEARTRIS', 'AWAKE', 'SWEET NONFICTION'], albums: ['U', 'COCONUT', 'AWAKE', 'Press Play'] },
]

const genericA = ['舞台完成度', '歌曲质感', '成员化学', '整体风格']
const genericB = ['新回归', '演唱会', '个人作品', '海外舞台']
const genericC = ['出道舞台', '回归舞台', '演唱会直拍', '音乐放送']
const genericD = ['舞蹈', '声乐', '造型', '互动']

const questions = []

for (const group of groups) {
  const slug = group.name.toLowerCase().replace(/[^a-z0-9]+/g, '')
  const m = group.members
  const s = group.songs
  const a = group.albums
  const isSolo = m.length === 1

  const pack = isSolo
    ? [
        { prompt: `我最喜欢的 ${group.name} 歌曲是？`, options: take(s, 0) },
        { prompt: `我认为 ${group.name} 最治愈的歌是？`, options: take(s, 1) },
        { prompt: `我最爱的 ${group.name} 专辑是？`, options: take(a, 0) },
        { prompt: `我最被 ${group.name} 哪首歌的旋律打动？`, options: take(s, 2) },
        { prompt: `我最想循环的 ${group.name} 作品是？`, options: take(s, 3) },
        { prompt: `我认为 ${group.name} 最特别的是？`, options: genericA },
        { prompt: `我最期待 ${group.name} 的是？`, options: genericB },
        { prompt: `我最喜欢 ${group.name} 哪个时期的气质？`, options: ['出道期', '转型期', '成熟期', '最近'] },
        { prompt: `我最想听现场的 ${group.name} 歌曲是？`, options: take(s, 4) },
        { prompt: `我认为 ${group.name} 最适合深夜听的是？`, options: take(s, 5) },
        { prompt: `我最想当开场的 ${group.name} 歌曲是？`, options: take(s, 6) },
        { prompt: `我最爱 ${group.name} 哪个专辑时期？`, options: take(a, 1).map((album) => `${album} 时期`) },
        { prompt: `我最想反复看的 ${group.name} 舞台是？`, options: genericC },
        { prompt: `我认为 ${group.name} 最打动我的是？`, options: genericD },
        { prompt: `我下一次最想听 ${group.name} 唱的是？`, options: take(s, 0) },
      ]
    : [
        { prompt: `我最爱的 ${group.name} 成员是？`, options: take(m, 0) },
        { prompt: `我最喜欢的 ${group.name} 歌曲是？`, options: take(s, 0) },
        { prompt: `我心中 ${group.name} 最有气场的成员是？`, options: take(m, 1) },
        { prompt: `我最爱的 ${group.name} 专辑是？`, options: take(a, 0) },
        { prompt: `我最想听 ${group.name} 谁唱主歌？`, options: take(m, 2) },
        { prompt: `我认为 ${group.name} 最有记忆点的舞台是？`, options: take(s, 1).map((song) => `${song} 舞台`) },
        { prompt: `我最想和 ${group.name} 谁做朋友？`, options: take(m, 3) },
        { prompt: `我最被 ${group.name} 哪首歌打动？`, options: take(s, 2) },
        { prompt: `我认为 ${group.name} 最特别的是？`, options: genericA },
        { prompt: `我最期待 ${group.name} 的是？`, options: genericB },
        { prompt: `我最想循环的 ${group.name} 歌曲是？`, options: take(s, 3) },
        { prompt: `我认为 ${group.name} 最适合当开场的是？`, options: take(s, 4) },
        { prompt: `我最想看 ${group.name} 谁的直拍？`, options: take(m, 4) },
        { prompt: `我最喜欢 ${group.name} 哪个视觉时期？`, options: take(a, 1).map((album) => `${album} 时期`) },
        { prompt: `我最想和 ${group.name} 谁一起看演唱会？`, options: take(m, 5) },
      ]

  pack.forEach((item, index) => {
    const unique = [...new Set(item.options)]
    if (unique.length !== 4) {
      throw new Error(`${group.name} q${index + 1} has ${unique.length} unique options: ${item.options.join(' / ')}`)
    }
    questions.push({
      id: `${slug}-${index + 1}`,
      category: group.name,
      prompt: item.prompt,
      options: item.options,
    })
  })
}

const body = `export const questionBank = ${JSON.stringify(questions, null, 2)}

export default questionBank
`

const out = path.join(process.cwd(), 'src/data/questionBank.js')
fs.writeFileSync(out, body)
console.log(`wrote ${questions.length} questions for ${groups.length} groups`)
