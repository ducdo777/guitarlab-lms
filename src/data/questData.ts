export interface Exercise {
  id: string;
  text: string;
  done: boolean;
}

export interface Session {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  xp: number;
  color: string;
  x: number;
  y: number;
  unlocked: boolean;
  completed: boolean;
  content: {
    theory: { heading: string; body: string; youtubeId?: string }[];
    practice: { heading: string; body: string; duration?: string; youtubeId?: string }[];
    chords?: {
      youtubeId?: string;
      symbols: string[];
    };
    exercises: Exercise[];
  };
}

const DEFAULT_SESSIONS: Session[] = [
  {
    id: 1, icon: '🎸', xp: 100, color: '#34c759',
    title: 'Buổi 1', subtitle: 'Làm Quen Đàn Guitar',
    x: 25, y: 80, unlocked: true, completed: false,
    content: {
      theory: [
        {
          heading: '1. Các bộ phận chính của đàn Guitar',
          body: 'Guitar gồm: Đầu đàn (Headstock) chứa các trục lên dây, Cần đàn (Neck) với phím kim loại (Frets), Thùng đàn (Body) khuếch đại âm thanh. Mỗi phím kim loại cách nhau 1 nửa cung (semitone).',
        },
        {
          heading: '2. Tên 6 dây đàn',
          body: 'Từ dây dày đến mỏng: Dây 6 = E2 (Mi trầm), Dây 5 = A2 (La), Dây 4 = D3 (Rê), Dây 3 = G3 (Sol), Dây 2 = B3 (Si), Dây 1 = E4 (Mi cao). Mẹo nhớ: "Em Ăn Đủ Gạo Bổ Ích".',
        },
        {
          heading: '3. Tư thế ngồi và cầm đàn',
          body: 'Ngồi thẳng lưng, thùng đàn tựa vào đùi phải. Cần đàn nghiêng lên 30–45°. Ngón cái tay trái tựa nhẹ phía sau cần đàn để tạo lực đối trọng cho các ngón bấm.',
        },
      ],
      practice: [
        {
          heading: 'Luyện bấm dây mở',
          body: 'Gảy lần lượt từng dây từ dây 6 xuống dây 1 và ngược lại. Lắng nghe màu âm khác biệt giữa các dây.',
          duration: '10 phút',
        },
        {
          heading: 'Tập nhận biết dây bằng tai',
          body: 'Nhờ người nhỏ/chạm ngẫu nhiên 1 dây, nghe và đoán tên dây. Lặp lại 20 lần.',
          duration: '10 phút',
        },
      ],
      exercises: [
        { id: 'e1-1', text: 'Gảy 6 dây mở liên tục 3 lần không nhìn tay', done: false },
        { id: 'e1-2', text: 'Đọc đúng tên 6 dây theo thứ tự từ dày đến mỏng', done: false },
        { id: 'e1-3', text: 'Ngồi đúng tư thế trong 5 phút liên tục', done: false },
      ],
    },
  },
  {
    id: 2, icon: '✋', xp: 150, color: '#007AFF',
    title: 'Buổi 2', subtitle: 'Hợp Âm Em & Am',
    x: 75, y: 65, unlocked: false, completed: false,
    content: {
      theory: [
        {
          heading: '1. Hợp Âm Em (E Minor) — Dễ nhất',
          body: 'Chỉ dùng 2 ngón: Ngón giữa bấm dây A phím 2, Ngón áp út bấm dây D phím 2. Gảy cả 6 dây. Em có âm thanh buồn, nhẹ nhàng.',
        },
        {
          heading: '2. Hợp Âm Am (A Minor)',
          body: 'Dùng 3 ngón: Ngón trỏ bấm dây B phím 1, Ngón giữa bấm dây D phím 2, Ngón áp út bấm dây G phím 2. Gảy 5 dây từ A trở xuống (bỏ dây E trầm).',
        },
        {
          heading: '3. Chuyển hợp âm Em ↔ Am',
          body: 'Ngón áp út và ngón giữa "neo" ở cùng dây D và G — chỉ cần thêm/bỏ ngón trỏ ở dây B khi chuyển. Đây là kỹ thuật "anchor fingers" (ngón neo).',
        },
      ],
      practice: [
        {
          heading: 'Bấm và giữ hợp âm',
          body: 'Bấm Em, giữ 4 nhịp, thả ra, bấm lại. Kiểm tra từng dây có ra tiếng rõ không. Làm tương tự với Am.',
          duration: '10 phút',
        },
        {
          heading: 'Chuyển Em ↔ Am theo nhịp',
          body: 'Dùng Metronome 50 BPM. Mỗi 4 nhịp chuyển 1 hợp âm. Mục tiêu: chuyển trơn tru không bị ngắt tiếng.',
          duration: '15 phút',
        },
      ],
      exercises: [
        { id: 'e2-1', text: 'Bấm Em đúng — tất cả 6 dây đều ra tiếng', done: false },
        { id: 'e2-2', text: 'Bấm Am đúng — 5 dây từ A đều ra tiếng', done: false },
        { id: 'e2-3', text: 'Chuyển Em → Am → Em liên tục 10 lần ở 60 BPM', done: false },
        { id: 'e2-4', text: 'Gảy đoạn Em-Am-Em-Am theo nhịp 4/4', done: false },
      ],
    },
  },
  {
    id: 3, icon: '🎵', xp: 200, color: '#FF9F0A',
    title: 'Buổi 3', subtitle: 'Hợp Âm G, C, D',
    x: 30, y: 53, unlocked: false, completed: false,
    content: {
      theory: [
        {
          heading: '1. Hợp Âm G Major',
          body: 'Dùng 4 ngón: Ngón giữa dây A phím 2, Ngón trỏ dây E trầm phím 3, Ngón áp út dây B phím 3, Ngón út dây E cao phím 3. Gảy cả 6 dây. G có âm thanh vang và đầy đặn nhất.',
        },
        {
          heading: '2. Hợp Âm C Major',
          body: 'Ngón áp út dây A phím 3, Ngón giữa dây D phím 2, Ngón trỏ dây B phím 1. Gảy 5 dây từ A (bỏ dây E trầm). C là nền tảng của nhiều bài nhạc pop.',
        },
        {
          heading: '3. Hợp Âm D Major',
          body: 'Ngón trỏ dây G phím 2, Ngón giữa dây e phím 2, Ngón áp út dây B phím 3. Gảy chỉ 4 dây từ D (bỏ 2 dây E và A). D có âm thanh tươi sáng, vui tươi.',
        },
      ],
      practice: [
        {
          heading: 'Bài tập đổi hợp âm vòng tròn',
          body: 'Chơi vòng G → C → D → C → G liên tục. Đây là progression I-IV-V phổ biến nhất trong nhạc pop toàn thế giới.',
          duration: '15 phút',
        },
        {
          heading: 'Tập đổi nhanh 2 hợp âm',
          body: 'Chọn từng cặp: G↔C, C↔D, G↔D. Mỗi cặp luyện 3 phút ở 60 BPM.',
          duration: '10 phút',
        },
      ],
      chords: {
        youtubeId: 'dQw4w9WgXcQ',
        symbols: ['Em', 'Am']
      },
      exercises: [
        { id: 'e3-1', text: 'Bấm G Major — 6 dây đều ra tiếng', done: false },
        { id: 'e3-2', text: 'Bấm C Major — 5 dây đều ra tiếng', done: false },
        { id: 'e3-3', text: 'Bấm D Major — 4 dây đều ra tiếng', done: false },
        { id: 'e3-4', text: 'Chơi G-C-D-C-G liên tục 4 vòng ở 70 BPM', done: false },
      ],
    },
  },
  {
    id: 4, icon: '🥁', xp: 250, color: '#FF375F',
    title: 'Buổi 4', subtitle: 'Kỹ Thuật Quạt Dây',
    x: 75, y: 42, unlocked: false, completed: false,
    content: {
      theory: [
        {
          heading: '1. Cách cầm Pick đúng kỹ thuật',
          body: 'Cầm pick giữa ngón cái và đầu ngón trỏ. Phần nhọn nhô ra ~5mm. Cổ tay thả lỏng, cánh tay đung đưa từ khuỷu. Pick dày (1mm+) cho tiếng cứng; Pick mỏng (0.5mm) cho tiếng mềm.',
        },
        {
          heading: '2. Pattern Cơ Bản: Down-Down (DD)',
          body: '↓ ↓ ↓ ↓ — Gảy 4 lần xuống đều đặn theo nhịp 4/4. Đây là pattern đơn giản nhất, dùng Metronome 60 BPM để tập.',
        },
        {
          heading: '3. Pattern Phổ Biến Nhất: D-D-U-D-U',
          body: '↓ ↓ ↑ ↓ ↑ — Nhịp 1: ↓, Nhịp 2: ↓, Phách "và": ↑, Nhịp 3: ↓, Phách "và": ↑. Đây là pattern được dùng trong hầu hết bài nhạc pop!',
        },
      ],
      practice: [
        {
          heading: 'Không hợp âm — chỉ tập quạt',
          body: 'Chạm nhẹ tay trái lên dây (mute) và luyện pattern D-D-U-D-U nghe tiếng "chạch chạch". Tập đến khi tay phải tự động không cần nghĩ.',
          duration: '10 phút',
        },
        {
          heading: 'Quạt trên hợp âm Em',
          body: 'Bấm Em và áp dụng pattern D-D-U-D-U. Khi thành thạo, chuyển thêm sang Am theo 4 nhịp mỗi hợp âm.',
          duration: '15 phút',
        },
      ],
      exercises: [
        { id: 'e4-1', text: 'Quạt D-D-U-D-U trên Em liên tục 1 phút không dừng', done: false },
        { id: 'e4-2', text: 'Chuyển Em → Am và ngược lại giữ đúng nhịp quạt', done: false },
        { id: 'e4-3', text: 'Quạt vòng G-C-D với pattern D-D-U-D-U ở 70 BPM', done: false },
      ],
    },
  },
  {
    id: 5, icon: '🔄', xp: 300, color: '#5856D6',
    title: 'Buổi 5', subtitle: 'Chuyển Hợp Âm Mượt Mà',
    x: 25, y: 28, unlocked: false, completed: false,
    content: {
      theory: [
        {
          heading: '1. Nguyên tắc "Nhìn trước" (Look Ahead)',
          body: 'Khi đang gảy hợp âm hiện tại, não phải đã suy nghĩ đến hợp âm tiếp theo. Bắt đầu di chuyển tay trái vào cuối phách thứ 4 của mỗi nhịp, không phải đầu phách 1.',
        },
        {
          heading: '2. Ngón Anchor (Ngón Neo)',
          body: 'Xác định ngón tay không cần di chuyển khi chuyển hợp âm và giữ nguyên ngón đó. Ví dụ: C→Am, ngón giữa ở dây D phím 2 không đổi — đây là ngón neo.',
        },
        {
          heading: '3. Tập Chuyển Chậm Rồi Tăng Dần',
          body: 'Bắt đầu ở 40 BPM cho đến khi chuyển trơn 100%, sau đó tăng 5 BPM mỗi ngày. Không nên tập nhanh khi chưa chuyển đúng vì sẽ hình thành thói quen xấu.',
        },
      ],
      practice: [
        {
          heading: 'Luyện từng cặp hợp âm',
          body: 'Chọn 1 cặp: G↔Em, Am↔C, C↔G. Tập chuyển qua lại 4 phút mỗi cặp ở 60 BPM trước khi sang cặp tiếp theo.',
          duration: '20 phút',
        },
        {
          heading: 'Bài tập "1 phút đổi hợp âm"',
          body: 'Đặt đồng hồ 1 phút, đếm số lần chuyển hợp âm hoàn chỉnh. Mục tiêu: đạt 40 lần/phút = thành thạo.',
          duration: '10 phút',
        },
      ],
      chords: {
        symbols: ['G', 'C', 'D']
      },
      exercises: [
        { id: 'e5-1', text: 'Chuyển G → Em → Am → C → G liên tục 5 vòng ở 80 BPM', done: false },
        { id: 'e5-2', text: 'Đếm được 40+ lần chuyển hợp âm trong 1 phút', done: false },
        { id: 'e5-3', text: 'Chơi bài đơn giản với 3 hợp âm bất kỳ không dừng', done: false },
      ],
    },
  },
  {
    id: 6, icon: '🎶', xp: 350, color: '#FF6B00',
    title: 'Buổi 6', subtitle: 'Fingerpicking Cơ Bản',
    x: 50, y: 25, unlocked: false, completed: false,
    content: {
      theory: [
        {
          heading: '1. Vị Trí Ngón Tay Phải',
          body: 'p (pulgar) = Ngón cái → dây E, A, D trầm. i (indice) = Ngón trỏ → dây G. m (medio) = Ngón giữa → dây B. a (anular) = Ngón áp út → dây e cao. Các ngón cong tự nhiên, không gồng.',
        },
        {
          heading: '2. Pattern Fingerpicking Cơ Bản: p-i-m-a',
          body: 'Gảy Bass (p) → G (i) → B (m) → e (a). Lặp lại. Đây là pattern Travis Picking đơn giản nhất, tạo ra âm thanh arpeggio mượt mà.',
        },
        {
          heading: '3. Pattern "Bass Alternating"',
          body: 'Gảy dây Bass trầm nhất của hợp âm (p) → 3 dây còn lại (i-m-a cùng lúc hoặc lần lượt). Pattern này dùng nhiều trong nhạc acoustic folk.',
        },
      ],
      practice: [
        {
          heading: 'Tập p-i-m-a trên hợp âm Am',
          body: 'Không dùng Metronome trước. Gảy p-i-m-a chậm rãi, đảm bảo mỗi nốt đều rõ ràng. Khi thoải mái mới thêm Metronome 50 BPM.',
          duration: '15 phút',
        },
        {
          heading: 'Chuyển hợp âm với Fingerpicking',
          body: 'Chơi Am (8 nốt p-i-m-a-p-i-m-a) rồi chuyển sang C (8 nốt). Tiếp tục G rồi Em. Đây là vòng Am-C-G-Em siêu phổ biến.',
          duration: '10 phút',
        },
      ],
      exercises: [
        { id: 'e6-1', text: 'Gảy p-i-m-a trên Am đủ 8 nốt không bị nhầm ngón', done: false },
        { id: 'e6-2', text: 'Fingerpicking vòng Am → C → G → Em ở 50 BPM', done: false },
        { id: 'e6-3', text: 'Tập 1 bài ballad có fingerpicking từ đầu đến cuối', done: false },
      ],
    },
  },
  {
    id: 7, icon: '⚡', xp: 450, color: '#FF2D55',
    title: 'Buổi 7', subtitle: 'Barre Chord F & Bm',
    x: 65, y: 18, unlocked: false, completed: false,
    content: {
      theory: [
        {
          heading: '1. Barre Chord Là Gì?',
          body: 'Ngón trỏ bấm ngang toàn bộ 1 phím (6 dây cùng lúc) như cái "capo tay". Các ngón còn lại tạo thành hình hợp âm. Kỹ thuật này cho phép di chuyển cùng 1 "hình" lên xuống cần đàn.',
        },
        {
          heading: '2. F Major — Barre Phím 1',
          body: 'Ngón trỏ xệ toàn bộ phím 1. Ngón giữa dây G phím 2. Ngón áp út dây A phím 3. Ngón út dây D phím 3. Đây là hình E Major dịch lên phím 1. Ngón trỏ KHÔNG được cong — phải thẳng và ép sát phím kim loại.',
        },
        {
          heading: '3. Nguyên Tắc Di Chuyển Barre',
          body: 'Hình E Major ở phím 1 = F, phím 3 = G, phím 5 = A, phím 7 = B. Hình Am ở phím 5 = Dm, phím 7 = Em. Đây là sức mạnh của Barre — 1 hình = vô số hợp âm!',
        },
      ],
      practice: [
        {
          heading: 'Luyện xệ ngón trỏ riêng lẻ',
          body: 'Chỉ xệ ngón trỏ ở phím 1, gảy từng dây. Mỗi dây phải ra tiếng rõ. Điều chỉnh vị trí ngón trỏ (sát phím kim loại hơn) đến khi không bị câm dây nào.',
          duration: '10 phút',
        },
        {
          heading: 'Bấm F hoàn chỉnh + chuyển sang C',
          body: 'Luyện F → C → F → C ở 40 BPM. Đây là đoạn chuyển khó nhất trong guitar cơ bản. Kiên nhẫn — cần 2–4 tuần để thành thạo.',
          duration: '15 phút',
        },
      ],
      exercises: [
        { id: 'e7-1', text: 'Xệ ngón trỏ phím 1 — 6 dây đều ra tiếng', done: false },
        { id: 'e7-2', text: 'Bấm F hoàn chỉnh giữ 4 giây không bị câm dây', done: false },
        { id: 'e7-3', text: 'Chuyển F → C → F liên tục 10 lần ở 50 BPM', done: false },
        { id: 'e7-4', text: 'Chơi vòng F-C-Am-G không dừng', done: false },
      ],
    },
  },
  {
    id: 8, icon: '🌟', xp: 500, color: '#BF5AF2',
    title: 'Buổi 8', subtitle: 'Gam Pentatonic & Solo',
    x: 65, y: 10, unlocked: false, completed: false,
    content: {
      theory: [
        {
          heading: '1. Am Pentatonic Scale — Gam Solo #1',
          body: 'Gồm 5 nốt: A-C-D-E-G. Box Position 1 (phổ biến nhất): Phím 5-8 trên cần đàn. Hầu hết solo rock kinh điển (Guns N\'Roses, Led Zeppelin) đều từ gam này!',
        },
        {
          heading: '2. Kỹ Thuật Bend (Uốn Dây)',
          body: 'Sau khi gảy, đẩy dây lên (hoặc xuống) bằng ngón bấm để thay đổi cao độ. Full Bend = +1 cung (tăng 2 nửa cung). Half Bend = +½ cung. Bend tạo ra cảm xúc đặc trưng của Blues.',
        },
        {
          heading: '3. Hammer-On & Pull-Off',
          body: 'Hammer-On: Bấm nhanh ngón xuống dây tạo nốt mới không cần gảy lại. Pull-Off: Kéo ngón ra khỏi dây để tạo nốt thấp hơn. Kết hợp 2 kỹ thuật tạo ra legato (nốt liên mượt).',
        },
      ],
      practice: [
        {
          heading: 'Luyện gam theo pattern 2 nốt/dây',
          body: 'Đi lên (ascending): dây 6 phím 5-8, dây 5 phím 5-7, dây 4 phím 5-7... Đi xuống ngược lại. Dùng Metronome 60 BPM, mỗi nốt là 1 phách.',
          duration: '15 phút',
        },
        {
          heading: 'Tạo câu solo ngắn',
          body: 'Chọn 4-6 nốt trong Box 1, kết hợp bend và hammer-on để tạo "câu nhạc". Nghe lại và điều chỉnh. Đây là bước đầu tiên của việc improvise (ứng tấu).',
          duration: '15 phút',
        },
      ],
      exercises: [
        { id: 'e8-1', text: 'Đánh Am Pentatonic Box 1 lên xuống ở 80 BPM', done: false },
        { id: 'e8-2', text: 'Thực hiện Full Bend trên dây B phím 7 đúng cung', done: false },
        { id: 'e8-3', text: 'Tạo 1 câu solo 8 nốt dùng Pentatonic + Bend', done: false },
        { id: 'e8-4', text: 'Improvise 30 giây trên nền Am-C-G-Em', done: false },
      ],
    },
  },
];

export const getSessionsData = (): Session[] => {
  const data = localStorage.getItem('guitar_quest_data_v4');
  if (data) {
    try {
      return JSON.parse(data) as Session[];
    } catch (e) {
      console.error('Failed to parse guitar_quest_data_v2', e);
    }
  }
  return DEFAULT_SESSIONS;
};

export const saveSessionsData = (sessions: Session[]) => {
  localStorage.setItem('guitar_quest_data_v4', JSON.stringify(sessions));
};
