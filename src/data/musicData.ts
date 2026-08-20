// Music Data chuyên biệt cho GuitarLab - Lớp Dạy Guitar Trực Tuyến

export interface GuitarLesson {
  id: string;
  title: string;
  titleVi: string;
  category: string;
  categoryColor: string;
  difficulty: 'Cơ Bản' | 'Trung Cấp' | 'Nâng Cao';
  description: string;
  content: {
    sectionTitle: string;
    text: string;
    tip?: string;
    listenNote?: string;
  }[];
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export interface ChordDefinition {
  name: string;
  symbol: string;
  type: 'Major' | 'Minor' | '7th' | 'Sus/Dim' | 'Power';
  // Frets for strings E2 A2 D3 G3 B3 E4 (-1 = mute, 0 = open)
  guitarFrets: number[];
  fingers: number[]; // Which finger to use (1=index, 2=middle, 3=ring, 4=pinky, 0=open, -1=mute)
  barreFromFret?: number; // if barre chord, the fret to barre
  notes: string[];
  formula: string;
  difficulty: 'Cơ Bản' | 'Trung Cấp' | 'Nâng Cao';
}

export interface ScaleDefinition {
  name: string;
  nameVi: string;
  root: string;
  notes: string[];
  scaleNoteNames: string[]; // e.g. ['A', 'C', 'D', 'E', 'G']
  intervals: string[];
  description: string;
  positions?: string; // Common position descriptions for guitar
}

// === GUITAR LESSONS ===
export const LESSONS: GuitarLesson[] = [
  {
    id: 'guitar-basics',
    title: 'Guitar Anatomy & First Steps',
    titleVi: 'Chương 1: Cấu Trúc Đàn & Tư Thế Đúng',
    category: 'Nhập Môn Guitar',
    categoryColor: 'text-emerald-400',
    difficulty: 'Cơ Bản',
    description: 'Làm quen với cấu trúc đàn Guitar, cách cầm đàn đúng tư thế, đặt tay bấm và tay gảy đúng kỹ thuật để không bị đau.',
    content: [
      {
        sectionTitle: '1. Các Bộ Phận Chính Của Đàn Guitar',
        text: 'Guitar gồm: Đầu đàn (Headstock) chứa các trục lên dây, Cần đàn (Neck) với phím nhôm (Frets), Thùng đàn (Body) khuếch đại âm thanh. Guitar Acoustic dùng thùng rỗng, Guitar Electric dùng pickup điện.',
        tip: '💡 Phím kim loại (Fret) trên cần đàn chia cần đàn thành các nửa cung (semitone). Bấm sát phím kim loại sẽ cho ra tiếng rõ nhất.',
      },
      {
        sectionTitle: '2. Cách Cầm Đàn & Tư Thế Ngồi',
        text: 'Ngồi thẳng lưng, thùng đàn tựa vào đùi phải (tay thuận phải). Cần đàn hơi nghiêng lên khoảng 30–45 độ. Tay trái bấm phím, tay phải gảy dây. Ngón cái tay trái tựa nhẹ sau cần đàn để hỗ trợ lực bấm.',
        tip: '💡 Đừng gập cổ tay trái quá mức — giữ khuỷu tay bên trái thoải mái và ngón bấm đứng dựng thẳng góc với dây.',
      },
      {
        sectionTitle: '3. Tên 6 Dây Đàn Guitar',
        text: 'Guitar chuẩn 6 dây gồm (từ dày đến mỏng): Dây 6 = E2 (Mi trầm), Dây 5 = A2 (La), Dây 4 = D3 (Rê), Dây 3 = G3 (Sol), Dây 2 = B3 (Si), Dây 1 = E4 (Mi cao). Dây 1 mỏng nhất và cao nhất.',
        listenNote: 'E2',
        tip: '💡 Mẹo nhớ tên 6 dây theo câu: "Em Ăn Đủ Gạo Bổ Ích" = E A D G B E',
      },
    ],
    quiz: [
      {
        question: 'Sắp xếp 6 dây guitar từ dây TRẦM nhất đến dây CAO nhất là?',
        options: [
          'E - A - D - G - B - E (dày đến mỏng)',
          'E - B - G - D - A - E (mỏng đến dày)',
          'A - B - C - D - E - F',
          'Do - Re - Mi - Fa - Sol - La',
        ],
        correctIndex: 0,
        explanation: 'Từ dây số 6 (dây trầm nhất, dày nhất) đến dây số 1 (cao nhất, mỏng nhất): E2 - A2 - D3 - G3 - B3 - E4.',
      },
      {
        question: 'Vị trí ngón cái tay trái khi bấm hợp âm Guitar là?',
        options: [
          'Bọc ra trước để bấm thêm dây 6',
          'Tựa nhẹ phía sau cần đàn để hỗ trợ lực',
          'Không cần chú ý đến ngón cái',
          'Bấm chặt vào mặt cần đàn',
        ],
        correctIndex: 1,
        explanation: 'Ngón cái tay trái tựa nhẹ sau cần đàn để tạo lực đối nghịch giúp các ngón kia bấm dây chắc hơn mà không mỏi tay.',
      },
    ],
  },
  {
    id: 'open-chords',
    title: 'Open Chords - The Foundation',
    titleVi: 'Chương 2: Hợp Âm Mở (Open Chords) Cơ Bản',
    category: 'Hợp Âm Guitar',
    categoryColor: 'text-cyan-400',
    difficulty: 'Cơ Bản',
    description: 'Học 8 hợp âm mở thiết yếu (C, D, E, G, Am, Em, Dm, A) — nền tảng để chơi được hàng ngàn bài nhạc pop, folk, và rock.',
    content: [
      {
        sectionTitle: '1. Hợp Âm Em (E Minor) — Dễ Nhất',
        text: 'Em là hợp âm dễ nhất và nên học đầu tiên: Ngón 1 (trỏ) bấm dây A phím 2, Ngón 2 (giữa) bấm dây D phím 2. Gảy tất cả 6 dây từ trên xuống.',
        tip: '💡 Em còn gọi là "cổng vào guitar" vì chỉ dùng 2 ngón tay. Khi thành thạo Em, sẽ dễ dàng chuyển sang Am.',
        listenNote: 'E2',
      },
      {
        sectionTitle: '2. Hợp Âm Am (A Minor) — Cảm Xúc Buồn',
        text: 'Am dùng 3 ngón: Ngón 1 bấm dây B phím 1, Ngón 2 bấm dây D phím 2, Ngón 3 bấm dây G phím 2. Gảy 5 dây từ dây A2 trở xuống.',
        tip: '💡 Am và Em nghe rất hợp nhau — thử chuyển đổi qua lại Am → Em → Am để cảm nhận sự khác biệt!',
      },
      {
        sectionTitle: '3. Hợp Âm G (G Major) — Âm Vang To',
        text: 'G Major dùng 3 ngón hoặc 4 ngón: Cách phổ biến nhất: Ngón 2 bấm dây A phím 2, Ngón 1 bấm dây E trầm phím 3, Ngón 3 bấm dây B phím 3, Ngón 4 bấm dây E cao phím 3.',
        tip: '💡 Hợp âm G nghe vang nhất khi gảy toàn bộ 6 dây — rất phù hợp để mở đầu bài!',
      },
      {
        sectionTitle: '4. Chuyển Hợp Âm Nhanh (Chord Changes)',
        text: 'Mục tiêu thực hành: Chuyển qua lại giữa G → Em → C → D liên tục trong vòng 4 nhịp mỗi hợp âm (tempo 60 BPM). Đây là progression I-VI-IV-V phổ biến nhất trong nhạc Pop.',
        tip: '💡 Nhìn vào hợp âm TIẾP THEO ngay khi đang gảy hợp âm hiện tại để chuẩn bị tay trước.',
      },
    ],
    quiz: [
      {
        question: 'Hợp âm Em (E Minor) cần bao nhiêu ngón tay để bấm?',
        options: ['1 ngón', '2 ngón', '3 ngón', '4 ngón'],
        correctIndex: 1,
        explanation: 'Em chỉ cần 2 ngón: Ngón trỏ bấm dây A phím 2 và ngón giữa bấm dây D phím 2 — đây là hợp âm dễ nhất!',
      },
      {
        question: 'Khi bấm hợp âm Am, bạn gảy tổng cộng bao nhiêu dây?',
        options: ['6 dây (tất cả)', '5 dây (từ dây A)', '4 dây (từ dây D)', '3 dây'],
        correctIndex: 1,
        explanation: 'Hợp âm Am gảy 5 dây từ dây A2 trở xuống — bỏ dây E2 (dây trầm nhất) vì không thuộc thành phần hợp âm Am.',
      },
    ],
  },
  {
    id: 'strumming',
    title: 'Strumming & Rhythm Patterns',
    titleVi: 'Chương 3: Kỹ Thuật Quạt Dây & Tiết Tấu',
    category: 'Kỹ Thuật Guitar',
    categoryColor: 'text-amber-400',
    difficulty: 'Cơ Bản',
    description: 'Học cách quạt dây (strumming) đúng kỹ thuật bằng cả xuống (↓) và lên (↑), kết hợp với nhịp điệu để chơi nhạc có cảm xúc.',
    content: [
      {
        sectionTitle: '1. Cách Cầm Pick Guitar',
        text: 'Cầm pick giữa ngón cái và đầu ngón trỏ, để phần nhọn của pick nhô ra khoảng 5mm. Cổ tay thả lỏng, không gồng cứng. Cánh tay đung đưa từ khuỷu tay chứ không phải chỉ cổ tay.',
        tip: '💡 Pick dày (Heavy 1.0mm+) cho tiếng cứng, chắc. Pick mỏng (Thin 0.5mm) cho tiếng mềm, nhẹ hơn — thử cả hai để tìm loại phù hợp với bạn.',
      },
      {
        sectionTitle: '2. Pattern Quạt Cơ Bản: Down-Down-Down-Down',
        text: 'Bắt đầu với 4 nhịp quạt xuống (↓ ↓ ↓ ↓) đều đặn. Đếm "1 - 2 - 3 - 4" theo mỗi nhịp quạt. Tempo khuyến nghị: 60 BPM. Gảy một hợp âm Em và thực hành cho đến khi âm thanh đều và ổn định.',
        tip: '💡 Đặt máy metronome bên cạnh ngay từ đầu — chơi theo metronome là thói quen của guitarist chuyên nghiệp!',
      },
      {
        sectionTitle: '3. Pattern Quạt 8 Phách: D-D-U-D-U',
        text: 'Pattern phổ biến nhất trong nhạc pop: ↓ ↓ ↑ ↓ ↑ (với 1 ô nhịp 4/4). Đếm: "1 và 2 và 3 và 4" — số đếm = quạt xuống, "và" = quạt lên. Thực hành chậm rồi tăng dần tốc độ.',
      },
      {
        sectionTitle: '4. Kỹ Thuật Fingerpicking Cơ Bản',
        text: 'Fingerpicking (gảy ngón) dùng ngón cái (p) gảy dây trầm E-A-D, ngón trỏ (i) gảy dây G, ngón giữa (m) gảy dây B, ngón áp út (a) gảy dây E cao. Pattern cơ bản: Gảy Bass + Gảy Melody luân phiên.',
        tip: '💡 Fingerpicking tạo ra âm thanh lãng mạn, nhẹ nhàng — rất phù hợp cho bài ballad chậm.',
      },
    ],
    quiz: [
      {
        question: 'Pattern quạt phổ biến nhất trong nhạc pop 4/4 là?',
        options: [
          '↓ ↓ ↓ ↓ (4 nhịp xuống)',
          '↓ ↓ ↑ ↓ ↑ (pattern D-D-U-D-U)',
          '↑ ↑ ↑ ↑ (4 nhịp lên)',
          '↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑',
        ],
        correctIndex: 1,
        explanation: 'Pattern D-D-U-D-U (↓ ↓ ↑ ↓ ↑) là pattern quạt phổ biến nhất trong hầu hết bài nhạc pop hiện đại!',
      },
      {
        question: 'Khi cầm pick guitar, phần nhọn của pick nên nhô ra bao nhiêu?',
        options: ['1-2mm', '5mm', '10mm', '2cm'],
        correctIndex: 1,
        explanation: 'Pick nên nhô ra khoảng 5mm để vừa đủ gảy dây với lực kiểm soát tốt, không quá ít (dễ trượt) hay quá nhiều (dễ kẹt dây).',
      },
    ],
  },
  {
    id: 'barre-chords',
    title: 'Barre Chords — Level Up',
    titleVi: 'Chương 4: Hợp Âm Barre (Xệ Ngón) — Lên Cấp',
    category: 'Hợp Âm Guitar',
    categoryColor: 'text-cyan-400',
    difficulty: 'Trung Cấp',
    description: 'Học kỹ thuật bấm Barre Chord (xệ cả dãy phím bằng ngón trỏ) để chơi được MỌI hợp âm trên cần đàn.',
    content: [
      {
        sectionTitle: '1. Barre Chord Là Gì?',
        text: 'Barre Chord là kỹ thuật dùng ngón trỏ (ngón 1) bấm ngang cả 6 dây cùng lúc ở một phím, rồi các ngón còn lại bấm thêm các nốt của hợp âm. Với kỹ thuật này, bạn có thể di chuyển cùng một "hình" lên xuống cần đàn để tạo ra mọi hợp âm Major và Minor.',
        tip: '💡 Barre Chord là thử thách lớn nhất nhưng cũng là "cánh cửa vàng" — một khi học được, bạn có thể chơi bất kỳ hợp âm nào!',
      },
      {
        sectionTitle: '2. Hợp Âm Barre F Major (Phím 1)',
        text: 'F Major là hợp âm Barre đầu tiên và khó nhất. Ngón 1 xệ toàn bộ phím 1. Ngón 2 bấm dây G phím 2. Ngón 3 bấm dây A phím 3. Ngón 4 bấm dây D phím 3. Đây là "hình E Major" dịch lên phím 1.',
        tip: '💡 Luyện tập riêng lẻ: Chỉ cần xệ ngón trỏ và gảy thử từng dây — nếu dây nào bị câm, điều chỉnh vị trí ngón trỏ.',
      },
      {
        sectionTitle: '3. Di Chuyển Barre — Toàn Bộ Cần Đàn',
        text: 'Hình E Major bấm ở phím 1 = F, phím 2 = F#/Gb, phím 3 = G, phím 4 = Ab, phím 5 = A... Hình Am bấm ở phím 5 = Dm, phím 7 = Em. Đây là sức mạnh của Barre Chord!',
      },
    ],
    quiz: [
      {
        question: 'Hợp âm Barre F Major sử dụng "hình" hợp âm mở nào?',
        options: ['Hình C Major', 'Hình E Major', 'Hình D Major', 'Hình G Major'],
        correctIndex: 1,
        explanation: 'F Major Barre là hình E Major dịch lên phím 1 với ngón trỏ xệ toàn bộ dây ở phím 1.',
      },
      {
        question: 'Nếu dịch hình Barre E Major lên phím 5, bạn sẽ tạo ra hợp âm gì?',
        options: ['C Major', 'D Major', 'A Major', 'B Major'],
        correctIndex: 2,
        explanation: 'Hình E Major dịch lên phím 5 = A Major (vì phím 5 trên dây E2 là nốt A).',
      },
    ],
  },
  {
    id: 'scales-soloing',
    title: 'Scales & Guitar Soloing',
    titleVi: 'Chương 5: Gam Guitar & Kỹ Thuật Solo',
    category: 'Lead Guitar',
    categoryColor: 'text-pink-400',
    difficulty: 'Nâng Cao',
    description: 'Học Gam Ngũ Cung Thứ (Minor Pentatonic) — gam solo guitar phổ biến nhất trong Rock, Blues, và Pop.',
    content: [
      {
        sectionTitle: '1. Gam Am Pentatonic — Gam Solo Đầu Tiên',
        text: 'Am Pentatonic (La Thứ Ngũ Cung) gồm 5 nốt: A - C - D - E - G. Đây là gam solo phổ biến nhất trong Rock và Blues. Box Position 1 (vị trí phổ biến nhất) trên cần đàn từ phím 5 đến phím 8.',
        tip: '💡 Hầu hết các đoạn solo rock kinh điển (Led Zeppelin, Guns N Roses, Eric Clapton) đều dùng Am Pentatonic Box 1!',
        listenNote: 'A4',
      },
      {
        sectionTitle: '2. Kỹ Thuật Bend (Uốn Dây)',
        text: 'Bend là kỹ thuật dùng ngón tay đẩy dây lên (hoặc xuống) để thay đổi cao độ. Full Bend = tăng 1 cung (2 nửa cung). Half Bend = tăng nửa cung. Kỹ thuật Bend tạo ra cảm xúc âm nhạc đặc trưng của Blues và Rock.',
      },
      {
        sectionTitle: '3. Kỹ Thuật Hammer-On & Pull-Off',
        text: 'Hammer-On: Bấm nhanh ngón xuống dây để tạo ra âm thanh không cần gảy lại. Pull-Off: Kéo ngón ra khỏi dây để tạo âm thanh nốt dưới. Hai kỹ thuật này kết hợp tạo ra legato (nốt liên mượt mà).',
        tip: '💡 Kỹ thuật Hammer-On và Pull-Off là bí quyết để chơi solo nhanh mà tay không mỏi!',
      },
    ],
    quiz: [
      {
        question: 'Gam Am Pentatonic gồm bao nhiêu nốt?',
        options: ['4 nốt', '5 nốt', '7 nốt', '12 nốt'],
        correctIndex: 1,
        explanation: 'Pentatonic = Penta (5) + tonic (âm). Gam Am Pentatonic gồm đúng 5 nốt: A - C - D - E - G.',
      },
      {
        question: 'Kỹ thuật Bend guitar cho phép bạn làm gì?',
        options: [
          'Gảy dây nhanh hơn',
          'Thay đổi cao độ bằng cách đẩy dây lên/xuống',
          'Tắt tiếng dây đột ngột',
          'Bấm được hợp âm Barre',
        ],
        correctIndex: 1,
        explanation: 'Bend là kỹ thuật đẩy dây đàn để thay đổi cao độ — Full Bend tăng 1 cung, Half Bend tăng nửa cung.',
      },
    ],
  },
];

// === GUITAR CHORD DATABASE ===
export const CHORD_DATABASE: ChordDefinition[] = [
  // OPEN CHORDS (BASIC)
  {
    name: 'E Minor',
    symbol: 'Em',
    type: 'Minor',
    guitarFrets: [0, 2, 2, 0, 0, 0],
    fingers:     [0, 2, 3, 0, 0, 0],
    notes: ['E2', 'B2', 'E3', 'G3', 'B3', 'E4'],
    formula: '1 - b3 - 5',
    difficulty: 'Cơ Bản',
  },
  {
    name: 'A Minor',
    symbol: 'Am',
    type: 'Minor',
    guitarFrets: [-1, 0, 2, 2, 1, 0],
    fingers:     [-1, 0, 2, 3, 1, 0],
    notes: ['A2', 'E3', 'A3', 'C4', 'E4'],
    formula: '1 - b3 - 5',
    difficulty: 'Cơ Bản',
  },
  {
    name: 'E Major',
    symbol: 'E',
    type: 'Major',
    guitarFrets: [0, 2, 2, 1, 0, 0],
    fingers:     [0, 3, 4, 2, 0, 0],
    notes: ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'],
    formula: '1 - 3 - 5',
    difficulty: 'Cơ Bản',
  },
  {
    name: 'D Major',
    symbol: 'D',
    type: 'Major',
    guitarFrets: [-1, -1, 0, 2, 3, 2],
    fingers:     [-1, -1, 0, 1, 3, 2],
    notes: ['D3', 'A3', 'D4', 'F#4'],
    formula: '1 - 3 - 5',
    difficulty: 'Cơ Bản',
  },
  {
    name: 'G Major',
    symbol: 'G',
    type: 'Major',
    guitarFrets: [3, 2, 0, 0, 0, 3],
    fingers:     [3, 2, 0, 0, 0, 4],
    notes: ['G2', 'B2', 'D3', 'G3', 'B3', 'G4'],
    formula: '1 - 3 - 5',
    difficulty: 'Cơ Bản',
  },
  {
    name: 'C Major',
    symbol: 'C',
    type: 'Major',
    guitarFrets: [-1, 3, 2, 0, 1, 0],
    fingers:     [-1, 3, 2, 0, 1, 0],
    notes: ['C3', 'E3', 'G3', 'C4', 'E4'],
    formula: '1 - 3 - 5',
    difficulty: 'Cơ Bản',
  },
  {
    name: 'A Major',
    symbol: 'A',
    type: 'Major',
    guitarFrets: [-1, 0, 2, 2, 2, 0],
    fingers:     [-1, 0, 1, 2, 3, 0],
    notes: ['A2', 'E3', 'A3', 'C#4', 'E4'],
    formula: '1 - 3 - 5',
    difficulty: 'Cơ Bản',
  },
  {
    name: 'D Minor',
    symbol: 'Dm',
    type: 'Minor',
    guitarFrets: [-1, -1, 0, 2, 3, 1],
    fingers:     [-1, -1, 0, 2, 3, 1],
    notes: ['D3', 'A3', 'D4', 'F4'],
    formula: '1 - b3 - 5',
    difficulty: 'Cơ Bản',
  },
  // INTERMEDIATE
  {
    name: 'F Major (Barre)',
    symbol: 'F',
    type: 'Major',
    guitarFrets: [1, 3, 3, 2, 1, 1],
    fingers:     [1, 3, 4, 2, 1, 1],
    barreFromFret: 1,
    notes: ['F2', 'C3', 'F3', 'A3', 'C4', 'F4'],
    formula: '1 - 3 - 5',
    difficulty: 'Trung Cấp',
  },
  {
    name: 'B Minor (Barre)',
    symbol: 'Bm',
    type: 'Minor',
    guitarFrets: [-1, 2, 4, 4, 3, 2],
    fingers:     [-1, 1, 3, 4, 2, 1],
    barreFromFret: 2,
    notes: ['B2', 'F#3', 'B3', 'D4', 'F#4'],
    formula: '1 - b3 - 5',
    difficulty: 'Trung Cấp',
  },
  {
    name: 'A7 (Dominant 7th)',
    symbol: 'A7',
    type: '7th',
    guitarFrets: [-1, 0, 2, 0, 2, 0],
    fingers:     [-1, 0, 2, 0, 3, 0],
    notes: ['A2', 'E3', 'A3', 'C#4', 'G4'],
    formula: '1 - 3 - 5 - b7',
    difficulty: 'Cơ Bản',
  },
  {
    name: 'G7 (Dominant 7th)',
    symbol: 'G7',
    type: '7th',
    guitarFrets: [3, 2, 0, 0, 0, 1],
    fingers:     [3, 2, 0, 0, 0, 1],
    notes: ['G2', 'B2', 'D3', 'G3', 'B3', 'F4'],
    formula: '1 - 3 - 5 - b7',
    difficulty: 'Cơ Bản',
  },
  {
    name: 'D7 (Dominant 7th)',
    symbol: 'D7',
    type: '7th',
    guitarFrets: [-1, -1, 0, 2, 1, 2],
    fingers:     [-1, -1, 0, 2, 1, 3],
    notes: ['D3', 'A3', 'D4', 'F#4', 'C5'],
    formula: '1 - 3 - 5 - b7',
    difficulty: 'Cơ Bản',
  },
  {
    name: 'E7 (Dominant 7th)',
    symbol: 'E7',
    type: '7th',
    guitarFrets: [0, 2, 0, 1, 0, 0],
    fingers:     [0, 2, 0, 1, 0, 0],
    notes: ['E2', 'B2', 'E3', 'G#3', 'D4', 'E4'],
    formula: '1 - 3 - 5 - b7',
    difficulty: 'Cơ Bản',
  },
  {
    name: 'G Power Chord',
    symbol: 'G5',
    type: 'Power',
    guitarFrets: [3, 5, 5, -1, -1, -1],
    fingers:     [1, 3, 4, -1, -1, -1],
    notes: ['G2', 'D3', 'G3'],
    formula: '1 - 5',
    difficulty: 'Cơ Bản',
  },
];

// === GUITAR SCALES ===
export const SCALE_DATABASE: ScaleDefinition[] = [
  {
    name: 'Am Pentatonic Scale',
    nameVi: 'Gam Am Ngũ Cung — Gam Solo #1',
    root: 'A',
    notes: ['A4', 'C5', 'D5', 'E5', 'G5', 'A5'],
    scaleNoteNames: ['A', 'C', 'D', 'E', 'G'],
    intervals: ['1', 'b3', '4', '5', 'b7', '8'],
    description: 'Gam solo phổ biến nhất trong Rock, Blues và Pop. Box Position 1 nằm ở phím 5-8 trên cần đàn.',
    positions: 'Box 1: Phím 5-8 | Box 2: Phím 7-10 | Box 5: Phím 12-15',
  },
  {
    name: 'A Minor Natural Scale',
    nameVi: 'Gam La Thứ Tự Nhiên',
    root: 'A',
    notes: ['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5'],
    scaleNoteNames: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    intervals: ['1', '2', 'b3', '4', '5', 'b6', 'b7', '8'],
    description: 'Gam thứ tự nhiên song song với C Major — dùng trong nhạc cổ điển, folk và pop.',
    positions: 'Vị trí mở ở phím 0-2 hoặc cao hơn ở phím 5',
  },
  {
    name: 'C Major Scale',
    nameVi: 'Gam Đô Trưởng',
    root: 'C',
    notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
    scaleNoteNames: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    intervals: ['1', '2', '3', '4', '5', '6', '7', '8'],
    description: 'Gam cơ bản không có dấu thăng/giáng — lý tưởng để học đọc nốt nhạc và lý thuyết âm nhạc cơ bản.',
    positions: 'Vị trí mở phím 0-3 | Vị trí thứ 2 phím 5-8',
  },
  {
    name: 'A Blues Scale',
    nameVi: 'Gam A Blues — Cảm Xúc Sâu',
    root: 'A',
    notes: ['A4', 'C5', 'D5', 'D#5', 'E5', 'G5', 'A5'],
    scaleNoteNames: ['A', 'C', 'D', 'D#', 'E', 'G'],
    intervals: ['1', 'b3', '4', 'b5', '5', 'b7', '8'],
    description: 'Gam Blues thêm "Blue Note" (b5) vào Pentatonic tạo ra âm thanh đặc trưng của nhạc Blues và Rock.',
    positions: 'Box 1 phím 5-8, thêm nốt D#/Eb',
  },
];
