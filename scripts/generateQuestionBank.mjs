import fs from 'node:fs'
import path from 'node:path'

const take = (list, start, size = 4) => {
  if (list.length <= size) return list.slice()
  return Array.from({ length: size }, (_, i) => list[(start + i) % list.length])
}

const pairOptions = (members) => {
  const pairs = []
  for (let i = 0; i < members.length; i += 1) {
    for (let j = i + 1; j < members.length; j += 1) {
      pairs.push(`${members[i]} × ${members[j]}`)
    }
  }
  return pairs
}

const defaultStyles = ['高冷气场', '甜美可爱', '复古质感', '街头嘻哈']
const defaultVariety = ['团综名场面', '回归直播', '综艺通告', '休息室花絮']
const defaultConcerts = ['单独巡演', '粉丝见面会', '音乐节', '线上演唱会']
const genericA = ['舞台完成度', '歌曲质感', '成员化学', '整体风格']
const genericB = ['新回归', '演唱会', '个人作品', '海外舞台']
const genericC = ['出道舞台', '回归舞台', '演唱会直拍', '音乐放送']
const genericD = ['舞蹈', '声乐', '造型', '互动']

const groups = [
  { name: 'BLACKPINK', members: ['Jisoo', 'Jennie', 'Rosé', 'Lisa'], songs: ['Boombayah', 'DDU-DU DDU-DU', 'Kill This Love', 'How You Like That', 'Lovesick Girls', 'Pink Venom', 'Shut Down'], albums: ['Square Up', 'Kill This Love', 'The Album', 'Born Pink'], variety: ['BLACKPINK HOUSE', '24/365 with BLACKPINK', 'Born Pink 纪录片', '综艺通告'], styles: ['高冷女王', '粉黑甜美', '嘻哈街头', '华丽舞台'] },
  { name: 'BTS', members: ['RM', 'Jin', 'SUGA', 'j-hope', 'Jimin', 'V', 'Jungkook'], songs: ['Spring Day', 'DNA', 'Fake Love', 'Boy With Luv', 'Dynamite', 'Butter', 'Life Goes On'], albums: ['Wings', 'Love Yourself: Tear', 'Map of the Soul: 7', 'BE'], variety: ['Run BTS', 'In the SOOP', 'Bon Voyage', 'Festa 直播'], styles: ['青春校园', '暗黑概念', '轻松治愈', '舞台霸总'] },
  { name: 'TWICE', members: ['Nayeon', 'Jeongyeon', 'Momo', 'Sana', 'Jihyo', 'Mina', 'Dahyun', 'Chaeyoung', 'Tzuyu'], songs: ['Cheer Up', 'TT', 'Likey', 'What is Love?', 'FANCY', 'Feel Special', 'I CAN\'T STOP ME'], albums: ['Twicetagram', 'Feel Special', 'Eyes Wide Open', 'Formula of Love: O+T=<3'], variety: ['TIME TO TWICE', 'TWICE TV', 'Seize the Light', '周刊偶像'], styles: ['元气甜美', '夏日清爽', '复古少女', '酷飒舞台'] },
  { name: 'SEVENTEEN', members: ['S.Coups', 'Jeonghan', 'Joshua', 'Jun', 'Hoshi', 'Wonwoo', 'Woozi', 'DK', 'Mingyu', 'The8', 'Seungkwan', 'Vernon', 'Dino'], songs: ['Don\'t Wanna Cry', 'Thanks', 'Home', 'God\'s Menu', 'Hot', 'Super', 'God of Music'], albums: ['You Make My Day', 'An Ode', 'Attacca', 'FML'], variety: ['Going Seventeen', 'NANA TOUR', 'In Caratland', '认识的哥哥'], styles: ['表演型男团', '温柔治愈', '强劲编舞', '轻松日常'] },
  { name: 'aespa', members: ['Karina', 'Giselle', 'Winter', 'Ningning'], songs: ['Black Mamba', 'Next Level', 'Savage', 'Spicy', 'Drama', 'Supernova', 'Whiplash'], albums: ['Savage', 'Girls', 'My World', 'Armageddon'], variety: ['aespa SYNK', 'KWANGYA 直播', '回归直播', '综艺通告'], styles: ['未来感', '高冷气场', '甜美冬感', '强劲编舞'] },
  { name: 'IVE', members: ['Yujin', 'Gaeul', 'Rei', 'Wonyoung', 'Liz', 'Leeseo'], songs: ['ELEVEN', 'LOVE DIVE', 'After LIKE', 'I AM', 'Either Way', 'HEYA', 'Accendio'], albums: ['I\'ve IVE', 'I\'ve Mine', 'IVE SWITCH', 'IVE EMPATHY'], variety: ['IVE ON', '回归直播', '综艺通告', '休息室花絮'], styles: ['高冷名媛', '清爽校园', '复古优雅', '甜美可爱'] },
  { name: 'NewJeans', members: ['Minji', 'Hanni', 'Danielle', 'Haerin', 'Hyein'], songs: ['Attention', 'Hype Boy', 'Ditto', 'OMG', 'Super Shy', 'How Sweet', 'Right Now'], albums: ['New Jeans', 'Get Up', 'How Sweet', 'Supernatural'], variety: ['NewJeans TV', '回归直播', '品牌纪录片', '休息室花絮'], styles: ['Y2K', '清爽校园', '慵懒夏日', '复古流行'] },
  { name: 'Stray Kids', members: ['Bang Chan', 'Lee Know', 'Changbin', 'Hyunjin', 'HAN', 'Felix', 'Seungmin', 'I.N'], songs: ['MIROH', 'Back Door', 'Thunderous', 'MANIAC', 'CASE 143', 'S-Class', 'Chk Chk Boom'], albums: ['GO生', 'NOEASY', 'ODDINARY', '★★★★★ 5-STAR'], variety: ['SKZ CODE', 'Two Kids Room', '回归直播', '综艺通告'], styles: ['狂躁自我', '暗黑概念', '轻松搞笑', '强劲嘻哈'] },
  { name: 'EXO', members: ['Suho', 'Xiumin', 'Lay', 'Baekhyun', 'Chen', 'Chanyeol', 'D.O.', 'Kai', 'Sehun'], songs: ['Growl', 'Call Me Baby', 'Love Shot', 'Tempo', 'Ko Ko Bop', 'Obsession', 'Cream Soda'], albums: ['XOXO', 'EXODUS', 'THE WAR', 'EXIST'], variety: ['EXO Ladder', '旅行的威力', '回归直播', '综艺通告'], styles: ['都市成熟', '复古性感', '强劲舞曲', '温柔抒情'] },
  { name: 'Red Velvet', members: ['Irene', 'Seulgi', 'Wendy', 'Joy', 'Yeri'], songs: ['Red Flavor', 'Peek-A-Boo', 'Bad Boy', 'Psycho', 'Queendom', 'Feel My Rhythm', 'Cosmic'], albums: ['The Red', 'Perfect Velvet', 'The ReVe Festival', 'Cosmic'], variety: ['Level Up Project', '回归直播', '综艺通告', '休息室花絮'], styles: ['Red 明快', 'Velvet 成熟', '复古优雅', '甜美夏日'] },
  { name: '少女时代', members: ['Taeyeon', 'Sunny', 'Tiffany', 'Hyoyeon', 'Yuri', 'Sooyoung', 'Yoona', 'Seohyun'], songs: ['Into the New World', 'Gee', 'Genie', 'Oh!', 'The Boys', 'I Got a Boy', 'Forever 1'], albums: ['Gee', 'The Boys', 'I Got a Boy', 'Holiday Night'], variety: ['少女时代的 Hello Baby', 'Channel SNSD', '综艺通告', '演唱会花絮'], styles: ['青春少女', '华丽女王', '清爽夏日', '成熟优雅'] },
  { name: 'IU', members: ['IU'], songs: ['Good Day', 'Through the Night', 'Palette', 'Blueming', 'Celebrity', 'Lilac', 'Love Wins All'], albums: ['Last Fantasy', 'Modern Times', 'Palette', 'Lilac'], variety: ['IU 的 Pallete', '综艺通告', '演唱会花絮', '直播'], styles: ['清透民谣', '复古爵士', '轻快流行', '成熟叙事'] },
  { name: 'ENHYPEN', members: ['Heeseung', 'Jay', 'Jake', 'Sunghoon', 'Sunoo', 'Jungwon', 'Ni-ki'], songs: ['Given-Taken', 'Drunk-Dazed', 'Tamed-Dashed', 'Polaroid Love', 'Bite Me', 'Sweet Venom', 'No Doubt'], albums: ['BORDER : DAY ONE', 'DIMENSION : DILEMMA', 'MANIFESTO : DAY 1', 'ROMANCE : UNTOLD'], variety: ["EN-O'CLOCK", 'EN-DRAMA', '回归直播', '休息室花絮'], styles: ['暗黑吸血鬼', '校园青春', '华丽舞台', '温柔日常'] },
  { name: 'TXT', members: ['Yeonjun', 'Soobin', 'Beomgyu', 'Taehyun', 'Huening Kai'], songs: ['CROWN', '9 and Three Quarters (Run Away)', '0X1=LOVESONG', 'Good Boy Gone Bad', 'Sugar Rush Ride', 'Chasing That Feeling', 'Over The Moon'], albums: ['The Dream Chapter: MAGIC', 'The Chaos Chapter: FREEZE', 'minisode 2: Thursday\'s Child', 'The Name Chapter: TEMPTATION'], variety: ['TO DO', '现在开始 TXT', '回归直播', '休息室花絮'], styles: ['梦幻青春', '摇滚叛逆', '甜美可爱', '成长叙事'] },
  { name: 'SHINee', members: ['Onew', 'Jonghyun', 'Key', 'Minho', 'Taemin'], songs: ['Replay', 'Lucifer', 'Sherlock', 'Dream Girl', 'View', 'Everybody', 'Don\'t Call Me'], albums: ['The SHINee World', 'Odd', 'The Story of Light', 'HARD'], variety: ['SHINee\'s Back', '任意依恋', '综艺通告', '演唱会花絮'], styles: ['精致表演', '实验概念', '成熟都市', '轻快夏日'] },
  { name: 'NCT 127', members: ['Johnny', 'Taeyong', 'Yuta', 'Doyoung', 'Jaehyun', 'Jungwoo', 'Mark', 'Haechan'], songs: ['Cherry Bomb', 'Regular', 'Kick It', 'Sticker', '2 Baddies', 'Fact Check', 'Walk'], albums: ['Regular-Irregular', 'Neo Zone', 'Sticker', 'Fact Check'], variety: ['NCT LIFE', '回归直播', '综艺通告', '休息室花絮'], styles: ['实验噪音', '城市嘻哈', '复古放克', '强劲编舞'] },
  { name: 'NCT DREAM', members: ['Mark', 'Renjun', 'Jeno', 'Haechan', 'Jaemin', 'Chenle', 'Jisung'], songs: ['Chewing Gum', 'We Young', 'BOOM', 'Hot Sauce', 'Hello Future', 'Candy', 'Smoothie'], albums: ['Hot Sauce', 'Glitch Mode', 'ISTJ', 'DREAMSCAPE'], variety: ['NCT LIFE', 'DREAM 团综', '回归直播', '休息室花絮'], styles: ['青春校园', '夏日清爽', '强劲编舞', '可爱糖果'] },
  { name: 'ASTRO', members: ['MJ', 'Jinjin', 'Cha Eunwoo', 'Moonbin', 'Rocky', 'Sanha'], songs: ['Hide & Seek', 'Breathless', 'Baby', 'Crazy Sexy Cool', 'All Night', 'Blue Flame', 'After Midnight'], albums: ['Spring Up', 'All Light', 'Blue Flame', 'Switch On'], variety: ['ASTRO OK! Ready', '回归直播', '综艺通告', '演唱会花絮'], styles: ['清爽少年', '都市成熟', '温柔抒情', '明亮舞台'] },
  { name: 'LE SSERAFIM', members: ['Chaewon', 'Sakura', 'Yunjin', 'Kazuha', 'Eunchae'], songs: ['FEARLESS', 'ANTIFRAGILE', 'UNFORGIVEN', 'EASY', 'Smart', 'CRAZY', 'HOT'], albums: ['FEARLESS', 'ANTIFRAGILE', 'UNFORGIVEN', 'EASY'], variety: ['LENIVERSE', '回归直播', '综艺通告', '休息室花絮'], styles: ['酷飒自信', '摇滚气场', '清爽夏日', '华丽舞台'] },
  { name: 'GOT7', members: ['JB', 'Mark', 'Jackson', 'Jinyoung', 'Youngjae', 'BamBam', 'Yugyeom'], songs: ['Just Right', 'If You Do', 'Hard Carry', 'Never Ever', 'Lullaby', 'You Calling My Name', 'NANANA'], albums: ['Got It?', 'Flight Log: Turbulence', 'Eyes On You', 'Dye'], variety: ['GOT7 Real', 'Hard Carry', '综艺通告', '演唱会花絮'], styles: ['青春嘻哈', '轻松可爱', '成熟都市', '强劲编舞'] },
  { name: 'MONSTA X', members: ['Shownu', 'Minhyuk', 'Kihyun', 'Hyungwon', 'Jooheon', 'I.M'], songs: ['Trespass', 'Beautiful', 'Dramarama', 'Shoot Out', 'Alligator', 'Love Killa', 'Beautiful Liar'], albums: ['The Clan Pt. 2.5', 'Take.1 Are You There?', 'Fatal Love', 'REASON'], variety: ['RIGHT NOW', '回归直播', '综艺通告', '休息室花絮'], styles: ['强劲野兽', '性感成熟', '轻松日常', '暗黑概念'] },
  { name: 'THE BOYZ', members: ['Sangyeon', 'Jacob', 'Younghoon', 'Hyunjae', 'Juyeon', 'Kevin', 'New', 'Q', 'Ju Haknyeon', 'Sunwoo', 'Eric'], songs: ['Boy', 'No Air', 'Bloom Bloom', 'The Stealer', 'Maverick', 'ROAR', 'TRIGGER'], albums: ['The Start', 'Reveal', 'THRILL-ING', 'PHANTASY'], variety: ['THE BOYZ 花絮', '回归直播', '综艺通告', '休息室花絮'], styles: ['清爽少年', '暗黑气场', '华丽舞台', '轻松可爱'] },
  { name: 'ATEEZ', members: ['Hongjoong', 'Seonghwa', 'Yunho', 'Yeosang', 'San', 'Mingi', 'Wooyoung', 'Jongho'], songs: ['Pirate King', 'WAVE', 'Answer', 'Fireworks (I\'m The One)', 'Guerrilla', 'BOUNCY', 'WORK'], albums: ['Treasure EP.1', 'ZERO : FEVER Part.1', 'THE WORLD EP.FIN : WILL', 'GOLDEN HOUR : Part.1'], variety: ['ATEEZ 日志', '回归直播', '综艺通告', '休息室花絮'], styles: ['海盗冒险', '狂躁舞台', '成熟都市', '明亮夏日'] },
  { name: 'ITZY', members: ['Yeji', 'Lia', 'Ryujin', 'Chaeryeong', 'Yuna'], songs: ['DALLA DALLA', 'WANNABE', 'Not Shy', 'In the morning', 'LOCO', 'SNEAKERS', 'CAKE'], albums: ['IT\'z ICY', 'GUESS WHO', 'CHECKMATE', 'KILL MY DOUBT'], variety: ['ITZY? ITZY!', '回归直播', '综艺通告', '休息室花絮'], styles: ['自信酷飒', '街头嘻哈', '甜美可爱', '强劲编舞'] },
  { name: '(G)I-DLE', members: ['Miyeon', 'Minnie', 'Soyeon', 'Yuqi', 'Shuhua'], songs: ['LATATA', 'Oh my god', 'Tomboy', 'Nxde', 'Queencard', 'Super Lady', 'Klaxon'], albums: ['I am', 'I Trust', 'I Never Die', '2'], variety: ['(G)I-DLE 花絮', '回归直播', '综艺通告', '休息室花絮'], styles: ['自信宣言', '实验概念', '酷飒摇滚', '华丽女王'] },
  { name: 'EVERGLOW', members: ['E:U', 'Sihyeon', 'Mia', 'Onda', 'Aisha', 'Yiren'], songs: ['Bon Bon Chocolat', 'Adios', 'Dun Dun', 'La Di Da', 'First', 'Pirate', 'SLAY'], albums: ['Arrival of EVERGLOW', 'HUSH', '-77.82X-78.29', 'Return of the Girl'], variety: ['回归直播', '综艺通告', '舞台花絮', '休息室花絮'], styles: ['强劲编舞', '高冷气场', '甜美可爱', '未来感'] },
  { name: 'RIIZE', members: ['Shotaro', 'Eunseok', 'Sungchan', 'Wonbin', 'Sohee', 'Anton'], songs: ['Get A Guitar', 'Memories', 'Love 119', 'Talk Saxy', 'Impossible', 'Boom Boom Bass', 'Lucky'], albums: ['Get A Guitar', 'RIIZING', 'RIIZING : Epilogue', 'ODYSSEY'], variety: ['RIIZE 日志', '回归直播', '综艺通告', '休息室花絮'], styles: ['复古乐队', '清爽少年', '都市流行', '轻松夏日'] },
  { name: 'BOYNEXTDOOR', members: ['Sungho', 'Riwoo', 'Jaehyun', 'Taesan', 'Leehan', 'Woonhak'], songs: ['But Sometimes', 'Serenade', 'Earth, Wind & Fire', 'Nice Guy', 'IF I SAY, I LOVE YOU', 'One and Only'], albums: ['WHO!', 'HOW?', '19.99', 'WHY..'], variety: ['BND 花絮', '回归直播', '综艺通告', '休息室花絮'], styles: ['邻家少年', '复古放克', '轻松日常', '舞台气场'] },
  { name: 'Apink', members: ['Chorong', 'Bomi', 'Eunji', 'Namjoo', 'Hayoung'], songs: ['NoNoNo', 'Mr. Chu', 'LUV', 'I\'m so sick', '%%', 'Dumhdurum', 'Dilemma'], albums: ['Une Annee', 'Pink MEMORY', 'PERCENT', 'SELF'], variety: ['Apink 新闻', '综艺通告', '回归直播', '演唱会花絮'], styles: ['清纯少女', '成熟都市', '轻快夏日', '复古流行'] },
  { name: 'fromis_9', members: ['Saerom', 'Hayoung', 'Jiwon', 'Jisun', 'Seoyeon', 'Chaeyoung', 'Nagyung', 'Jiheon'], songs: ['To Heart', 'LOVE BOMB', 'FUN!', 'WE GO', 'DM', 'Stay This Way', 'Supersonic'], albums: ['To. Heart', 'My Little Society', 'Midnight Guest', 'Unlock My World'], variety: ['Channel_9', '回归直播', '综艺通告', '休息室花絮'], styles: ['清爽少女', '夏日活力', '复古可爱', '成熟舞台'] },
  { name: 'BABYMONSTER', members: ['Ruka', 'Pharita', 'Asa', 'Ahyeon', 'Rami', 'Rora', 'Chiquita'], songs: ['BATTER UP', 'Stuck In The Middle', 'SHEESH', 'LIKE THAT', 'CLIK CLAK', 'HOT SAUCE', 'WE GO UP'], albums: ['BATTER UP', 'BABYMONS7ER', 'DRIP', 'We Go Up'], variety: ['BAEMON 花絮', '回归直播', '综艺通告', '休息室花絮'], styles: ['强劲嘻哈', '高冷气场', '甜美反差', '华丽舞台'] },
  { name: 'ZEROBASEONE', members: ['Sung Hanbin', 'Zhang Hao', 'Kim Jiwoong', 'Seok Matthew', 'Kim Taerae', 'Ricky', 'Kim Gyuvin', 'Park Gunwook', 'Han Yujin'], songs: ['In Bloom', 'CRUSH', 'MELTING POINT', 'SWEAT', 'GOOD SO BAD', 'Doctor! Doctor!', 'BLUE'], albums: ['YOUTH IN THE SHADE', 'MELTING POINT', 'You had me at HELLO', 'BLUE PARADISE'], variety: ['ZB1 日志', '回归直播', '综艺通告', '休息室花絮'], styles: ['青春校园', '华丽舞台', '清爽夏日', '成熟都市'] },
  { name: 'NMIXX', members: ['Lily', 'Haewon', 'Sullyoon', 'Bae', 'Jiwoo', 'Kyujin'], songs: ['O.O', 'DICE', 'Love Me Like This', 'Dash', 'See that?', 'Know About Me', 'High Horse'], albums: ['AD MARE', 'ENTWURF', 'expérgo', 'Fe3O4: BREAK'], variety: ['NMIXX 花絮', '回归直播', '综艺通告', '休息室花絮'], styles: ['混响实验', '甜美可爱', '酷飒舞台', '清爽夏日'] },
  { name: 'TREASURE', members: ['Choi Hyunsuk', 'Jihoon', 'Yoshi', 'Junkyu', 'Yoon Jaehyuk', 'Asahi', 'Doyoung', 'Haruto', 'Park Jeongwoo', 'So Junghwan'], songs: ['BOY', 'I LOVE YOU', 'JIKJIN', 'HELLO', 'BONA BONA', 'KING KONG', 'LAST NIGHT'], albums: ['THE FIRST STEP: TREASURE EFFECT', 'THE SECOND STEP: CHAPTER ONE', 'THE SECOND STEP: CHAPTER TWO', 'REBOOT'], variety: ['TREASURE MAP', '回归直播', '综艺通告', '休息室花絮'], styles: ['青春嘻哈', '轻松日常', '强劲编舞', '甜美反差'] },
  { name: 'ILLIT', members: ['Yunah', 'Minju', 'Moka', 'Wonhee', 'Iroha'], songs: ['Magnetic', 'Lucky Girl Syndrome', 'Cherish (My Love)', 'Tick-Tack', 'Billyeoon Goyangi (Do the Dance)', 'jellyous'], albums: ['SUPER REAL ME', 'I\'LL LIKE YOU', 'bomb', 'Tick-Tack'], variety: ['ILLIT 花絮', '回归直播', '综艺通告', '休息室花絮'], styles: ['超现实少女', '甜美可爱', '轻快夏日', '复古流行'] },
  { name: 'KISS OF LIFE', members: ['Julie', 'Natty', 'Belle', 'Haneul'], songs: ['Shhh', 'Ugly Heart', 'Midas Touch', 'Sticky', 'Igloo', 'k bye'], albums: ['Kiss of Life', 'Born to be XX', 'Lose Yourself', 'Midas Touch'], variety: ['KIOF 花絮', '回归直播', '综艺通告', '休息室花絮'], styles: ['R&B 成熟', '酷飒舞台', '甜美反差', '都市夜感'] },
  { name: 'TWS', members: ['Shinyu', 'Dohoon', 'Youngjae', 'Hanjin', 'Jihoon', 'Kyungmin'], songs: ['Plot Twist', 'hey! hey!', 'If I\'m S', 'Last Festival', 'Countdown', 'BLAST'], albums: ['Sparkling Blue', 'SUMMER BEAT!', 'TRY WITH US', 'play hard'], variety: ['TWS 花絮', '回归直播', '综艺通告', '休息室花絮'], styles: ['清爽少年', '校园青春', '夏日活力', '轻松日常'] },
  { name: 'STAYC', members: ['Sumin', 'Sieun', 'Isa', 'Seeun', 'Yoon', 'J'], songs: ['SO BAD', 'ASAP', 'STEREOTYPE', 'RUN2U', 'Beautiful Monster', 'Teddy Bear', 'Bubble'], albums: ['Star To A Young Culture', 'STEREOTYPE', 'YOUNG-LUV.COM', 'Metamorphic'], variety: ['STAYC 花絮', '回归直播', '综艺通告', '休息室花絮'], styles: ['Teen Fresh', '甜美可爱', '酷飒反差', '清爽夏日'] },
  { name: 'WayV', members: ['Kun', 'Ten', 'Winwin', 'Xiaojun', 'Hendery', 'Yangyang'], songs: ['Regular', 'Take Off', 'Kick Back', 'Love Talk', 'Phantom', 'On My Youth', 'Give Me That'], albums: ['Take Over The Moon', 'Kick Back', 'Phantom', 'Give Me That'], variety: ['WayV 花絮', '回归直播', '综艺通告', '休息室花絮'], styles: ['都市成熟', '实验舞台', '复古夜感', '轻松日常'] },
  { name: 'PLAVE', members: ['Yejun', 'Noah', 'Bamby', 'Eunho', 'Hamin'], songs: ['Wait For You', 'Why?', 'Way 4 Luv', 'Pump Up The Volume!', 'Mega Vice', 'Dash', 'From'], albums: ['Asterum', 'Asterum : 134-1', 'Caligo Pt.1', 'Pump Up The Volume!'], variety: ['PLAVE 直播', '回归直播', '游戏直播', '演唱会花絮'], styles: ['虚拟偶像感', '摇滚气场', '甜美反差', '强劲舞曲'] },
  { name: 'MEOVV', members: ['Sooin', 'Gawon', 'Anna', 'Narin', 'Ella'], songs: ['MEOW', 'HANDS UP', 'DROP TOP', 'TOXIC'], albums: ['MEOW', 'HANDS UP', 'MY EYES OPEN VVIDE', 'DROP TOP'], variety: ['MEOVV 花絮', '回归直播', '综艺通告', '休息室花絮'], styles: ['高冷气场', '街头嘻哈', '华丽舞台', '甜美反差'] },
  { name: 'P1Harmony', members: ['Keeho', 'Theo', 'Jiung', 'Intak', 'Soul', 'Jongseob'], songs: ['Siren', '+82', 'Do It Like This', 'Jump', 'Sad Song', 'Pretty Boy', 'DUH!'], albums: ['DISHARMONY : STAND OUT', 'DISHARMONY : BREAK OUT', 'HARMONY : SET IN', 'Killin\' It'], variety: ['P1ece', '回归直播', '综艺通告', '休息室花絮'], styles: ['实验嘻哈', '强劲编舞', '轻松日常', '舞台气场'] },
  { name: 'Xdinary Heroes', members: ['Gunil', 'Jungsu', 'Gaon', 'O.de', 'Jun Han', 'Jooyeon'], songs: ['Happy Death Day', 'Test Me', 'Freakin\' Bad', 'Tight', 'Sweat', 'Night Before the End', 'Little Things'], albums: ['Hello, world!', 'Overload', 'Troubleshooting', 'LIVE and FALL'], variety: ['Xdinary 花絮', '回归直播', '乐队纪录片', '演唱会花絮'], styles: ['乐队摇滚', '暗黑概念', '青春热血', '抒情夜感'] },
  { name: 'DAY6', members: ['Sungjin', 'Young K', 'Wonpil', 'Dowoon'], songs: ['You Were Beautiful', 'I Like You', 'Time of Our Life', 'Zombie', 'Welcome to the Show', 'HAPPY', 'Maybe Tomorrow'], albums: ['Sunrise', 'Moonrise', 'The Book of Us : Gravity', 'Fourever'], variety: ['DAY6 花絮', '演唱会纪录片', '综艺通告', '直播'], styles: ['乐队抒情', '青春热血', '日常治愈', '舞台爆发'] },
  { name: 'MAMAMOO', members: ['Solar', 'Moonbyul', 'Wheein', 'Hwasa'], songs: ['You\'re the Best', 'Starry Night', 'HIP', 'gogobebe', 'Décalcomanie', 'Where Are We Now', 'I MISS YOU'], albums: ['Melting', 'Red Moon', 'Reality in BLACK', 'MIC ON'], variety: ['MooMoo Trip', '回归直播', '综艺通告', '演唱会花絮'], styles: ['复古灵魂', '强劲气场', '轻松搞笑', '华丽舞台'] },
  { name: 'Oh My Girl', members: ['Hyojung', 'Mimi', 'YooA', 'Seunghee', 'Yubin', 'Arin'], songs: ['Closer', 'Secret Garden', 'Nonstop', 'Dolphin', 'Dun Dun Dance', 'Real Love', 'Classified'], albums: ['WINDY DAY', 'Remember Me', 'NONSTOP', 'Real Love'], variety: ['OMG 花絮', '回归直播', '综艺通告', '休息室花絮'], styles: ['童话梦幻', '清爽夏日', '成熟都市', '轻快舞曲'] },
  { name: 'GFRIEND', members: ['Sowon', 'Yerin', 'Eunha', 'Yuju', 'SinB', 'Umji'], songs: ['Me Gustas Tu', 'Rough', 'Navillera', 'Time for the Moon Night', 'Sunrise', 'MAGO', 'Apple'], albums: ['LOL', 'The Awakening', 'Time for the Moon Night', '回:Walpurgis Night'], variety: ['GFRIEND 花絮', '回归直播', '综艺通告', '演唱会花絮'], styles: ['清纯少女', '强劲编舞', '梦幻夜感', '成熟转型'] },
  { name: '2NE1', members: ['CL', 'Park Bom', 'Dara', 'Minzy'], songs: ['Fire', 'I Am The Best', 'Lonely', 'Ugly', 'Come Back Home', 'Gotta Be You', 'I Don\'t Care'], albums: ['To Anyone', '2NE1 2nd Mini Album', 'Crush', 'NOLZA'], variety: ['2NE1 TV', '演唱会花絮', '综艺通告', '纪录片'], styles: ['嘻哈女王', '叛逆街头', '感性抒情', '华丽舞台'] },
  { name: 'BIGBANG', members: ['G-Dragon', 'T.O.P', 'Taeyang', 'Daesung'], songs: ['Haru Haru', 'Fantastic Baby', 'Bang Bang Bang', 'Loser', 'If You', 'FXXK IT', 'Still Life'], albums: ['MADE', 'ALIVE', 'Remember', 'Tonight'], variety: ['BIGBANG 花絮', '演唱会纪录片', '综艺通告', '直播'], styles: ['时尚嘻哈', '舞台霸总', '感性抒情', '华丽爆炸'] },
  { name: 'iKON', members: ['Jinhwan', 'Junhoe', 'Yunhyeong', 'Bobby', 'Donghyuk', 'Chanwoo'], songs: ['LOVE SCENARIO', 'Killing Me', 'RHYTHM TA', 'Airplane', 'DUMB & DUMBER', 'B-DAY', 'Goodbye Road'], albums: ['Welcome Back', 'Return', 'I DECIDE', 'FLASHBACK'], variety: ['iKON TV', '回归直播', '综艺通告', '休息室花絮'], styles: ['嘻哈街头', '轻松可爱', '成熟抒情', '舞台气场'] },
  { name: 'WINNER', members: ['Yoon', 'Jinwoo', 'Seunghoon', 'Mino'], songs: ['EMPTY', 'REALLY REALLY', 'Love Me Love Me', 'AH YEAH', 'I LOVE U', 'MILLIONS'], albums: ['EXIT : E', 'FATE NUMBER FOR', 'EVERYD4Y', 'HOLIDAY'], variety: ['WINNER TV', '回归直播', '综艺通告', '演唱会花絮'], styles: ['轻松日常', '都市抒情', '嘻哈气质', '夏日清爽'] },
  { name: 'NiziU', members: ['Mako', 'Rio', 'Maya', 'Riku', 'Ayaka', 'Mayuka', 'Rima', 'Miihi', 'Nina'], songs: ['Make you happy', 'Step and a step', 'Super Summer', 'CLAP CLAP', 'HEARTRIS', 'AWAKE', 'SWEET NONFICTION'], albums: ['U', 'COCONUT', 'AWAKE', 'Press Play'], variety: ['NiziU 日志', '回归直播', '综艺通告', '休息室花絮'], styles: ['元气甜美', '夏日清爽', '成熟舞台', '轻快流行'] },
]

const questions = []

for (const group of groups) {
  const slug = group.name.toLowerCase().replace(/[^a-z0-9]+/g, '')
  const m = group.members
  const s = group.songs
  const a = group.albums
  const styles = group.styles || defaultStyles
  const variety = group.variety || defaultVariety
  const concerts = group.concerts || defaultConcerts
  const cps = pairOptions(m)
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
        { prompt: `我最不爱听的 ${group.name} 歌曲是？`, options: take(s, 1) },
        { prompt: `我最不吃的 ${group.name} 专辑是？`, options: take(a, 1) },
        { prompt: `我最喜欢的 ${group.name} 风格是？`, options: styles },
        { prompt: `我最不吃的 ${group.name} 风格是？`, options: take(styles, 1) },
        { prompt: `我最喜欢的 ${group.name} 综艺/花絮是？`, options: variety },
        { prompt: `我最想看的 ${group.name} 演唱会形式是？`, options: concerts },
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
        { prompt: `我相对最不爱的 ${group.name} 成员是？`, options: take(m, 1) },
        { prompt: `我最不爱听的 ${group.name} 歌曲是？`, options: take(s, 1) },
        { prompt: `我最不吃的 ${group.name} 专辑是？`, options: take(a, 1) },
        { prompt: `我最喜欢的 ${group.name} 风格是？`, options: styles },
        { prompt: `我最不吃的 ${group.name} 风格是？`, options: take(styles, 1) },
        ...(cps.length >= 4
          ? [
              { prompt: `我最吃的 ${group.name} CP 是？`, options: take(cps, 0) },
              { prompt: `我最不吃的 ${group.name} CP 是？`, options: take(cps, 3) },
            ]
          : []),
        { prompt: `我最喜欢的 ${group.name} 团综/花絮是？`, options: variety },
        { prompt: `我最想看的 ${group.name} 演唱会形式是？`, options: concerts },
        { prompt: `我觉得 ${group.name} 团综里最好笑的是？`, options: take(m, 3) },
        { prompt: `我认为 ${group.name} 最治愈的歌是？`, options: take(s, 5) },
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
