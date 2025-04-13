export interface PersonaDialogue {
  introMessage: string;
  onSelectMessage: string;
  loadingMessages: [string, string, string];
  resultMessage: {
    low: string;
    mid: string;
    high: string;
  };
  signatureLine: string;
}

export interface PersonaDialogueLang {
  ko: PersonaDialogue;
  en: PersonaDialogue;
  jp: PersonaDialogue;
}

export const personaDialogues: Record<string, PersonaDialogueLang> = {
  "brutal-critic": {
    ko: {
      introMessage: "Viktor는 냉정함 그 자체. 마음의 준비는 됐나?",
      onSelectMessage: "좋아, 이제 대충 찍은 건 용서 못 해.",
      loadingMessages: [
        "광량 분석 중… 이 정도면 사진을 때려야 해.",
        "후보정 여지를 계산 중… 아니, 이건 찍을 때 망한 거야.",
        "디테일 분해 중… 너 진짜 이걸 괜찮다고 생각한 거야?",
      ],
      resultMessage: {
        low: "이건 솔직히 말해서 다시 찍어야 돼. 제대로.",
        mid: "괜찮은 구성이야. 하지만 다음엔 더 냉정하게 찍어.",
        high: "거의 괜찮아졌군. 오늘은 칭찬해주지.",
      },
      signatureLine: "이건 사진이 아니야. 그냥 야망 있는 스냅샷이지.",
    },
    en: {
      introMessage: "Viktor is brutally honest. Ready to be judged?",
      onSelectMessage: "Alright. No mercy for mediocrity.",
      loadingMessages: [
        "Analyzing light quality... this might get ugly.",
        "Evaluating post-processing potential… or lack thereof.",
        "Pixel-slicing every detail… did you really think this was good?",
      ],
      resultMessage: {
        low: "Honestly? This needs a complete do-over.",
        mid: "Some promise here, but still not sharp enough.",
        high: "Almost respectable. You earned a rare nod.",
      },
      signatureLine: "This isn’t a photo. It’s a snapshot with ambition.",
    },
    jp: {
      introMessage: "Viktorは容赦しない。覚悟はできてるか？",
      onSelectMessage: "よし、凡庸な写真には情け無用だ。",
      loadingMessages: [
        "光の質を分析中…これは酷い予感がする。",
        "後処理の可能性を計算中…ほぼゼロだな。",
        "ディテールをピクセル単位で解析中…本気でこれが良いと思った？",
      ],
      resultMessage: {
        low: "正直、これは最初から撮り直すべきだ。",
        mid: "悪くないが、まだまだ詰めが甘いな。",
        high: "やっと評価に値する。今回は認めよう。",
      },
      signatureLine: "これは写真じゃない。ただの野心的なスナップだ。",
    },
  },
  "film-bro": {
    ko: {
      introMessage: "Noel은 사진에서 필름의 향기를 찾는 사람이야.",
      onSelectMessage: "좋아, 이 장면에서 느껴지는 시네마 감성… 시작해보자.",
      loadingMessages: [
        "Ektachrome 느낌인데? 빛이 몽글몽글해.",
        "할레이션 분석 중… 감성 점수 높다.",
        "이거, 타르코프스키 오마주인가?",
      ],
      resultMessage: {
        low: "아쉬워. 감성은 있는데, 필름 톤이 안 살아있어.",
        mid: "필름 감성 살아있네. 구성만 좀 더 다듬었으면 좋았을 텐데.",
        high: "완벽해. 이건 마치 잊혀진 필름 스틸 같아.",
      },
      signatureLine: "이건 오즈가 비 오는 날 찍었을 법한 잊혀진 필름 같아.",
    },
    en: {
      introMessage: "Noel sees every photo as a scene from classic cinema.",
      onSelectMessage: "Let's get this cinematic breakdown started.",
      loadingMessages: [
        "Feels like expired Ektachrome… dreamy tones incoming.",
        "Analyzing halation… oh yeah, this is filmcore.",
        "Wait, is this a Tarkovsky homage?",
      ],
      resultMessage: {
        low: "Missed potential. The mood was there, but the framing’s off.",
        mid: "Nice grain, lovely tone. Just needed a touch more composition.",
        high: "A poetic frame. Lost still from a film I wish existed.",
      },
      signatureLine: "There's something undeniably poetic about the halation here—like a forgotten frame from a rainy-day Ozu film.",
    },
    jp: {
      introMessage: "Noelは写真に映画の情緒を求めるタイプだよ。",
      onSelectMessage: "この構図、まるで映画のワンシーンみたいだね。",
      loadingMessages: [
        "これはエクタクロームっぽい…淡い光が良い感じ。",
        "ハレーション確認中…フィルム感たっぷりだね。",
        "これはタルコフスキー風かも？",
      ],
      resultMessage: {
        low: "雰囲気はあるけど、構図が甘いかな。惜しい。",
        mid: "フィルムの粒状感が素敵。もう少し構成力があれば完璧だった。",
        high: "これは詩的な1枚だね。まるで幻の映画のワンカット。",
      },
      signatureLine: "このハレーション…まるで雨の日の小津映画から抜け出した1コマみたいだ。",
    }
  },
  "supportive-friend": {
  ko: {
    introMessage: "Sunny는 언제나 따뜻하게 응원해주는 친구예요 😊",
    onSelectMessage: "좋아, 같이 멋진 사진을 발견하러 가보자!",
    loadingMessages: [
      "이 사진… 느낌 너무 좋아요! 조금만 기다려줘요 💖",
      "이 감성, 진짜 감동이야… 분석중이에요!",
      "우와~ 이 정도면 이미 멋져요. 하지만 더 좋게 만들 수도 있죠!",
    ],
    resultMessage: {
      low: "괜찮아요! 여기서부터 더 좋아질 수 있어요. 가능성 충분해요 ✨",
      mid: "이 사진, 진짜 감성 있어요! 구도만 살짝 다듬어보면 완벽해요.",
      high: "우와~ 이건 감동이에요. 당신의 시선이 고스란히 담겼어요 💕",
    },
    signatureLine: "이 정도면 아기 새가 날개짓하는 수준이야 🐣",
  },
  en: {
    introMessage: "Sunny is that friend who always cheers you on 🫂",
    onSelectMessage: "Let’s go! I believe in your photo journey 💫",
    loadingMessages: [
      "This is already so sweet! Just analyzing a bit 💖",
      "Oh wow, I can feel the story in this. Almost done!",
      "You’ve got something special here. Let’s polish it up ✨",
    ],
    resultMessage: {
      low: "You're growing and that's what matters. Keep going, you're doing great!",
      mid: "So much potential here! A few tweaks and it’s golden.",
      high: "This is beautiful. Your perspective truly shines here 💕",
    },
    signatureLine: "This feels like a baby bird learning to fly 🐣",
  },
  jp: {
    introMessage: "Sunnyはいつも応援してくれる優しい友達だよ ☀️",
    onSelectMessage: "一緒に素敵な写真を見つけに行こう！",
    loadingMessages: [
      "この雰囲気…とても素敵！今ちょっと分析中ね 💖",
      "やさしさが溢れてるね…もうすぐ結果が出るよ！",
      "いい感じ！もっと良くするためにちょっと見てるところ！",
    ],
    resultMessage: {
      low: "大丈夫！ここからもっと良くなるよ。あなたには可能性がある！",
      mid: "この写真、とても心に響くね。少し整えれば完璧！",
      high: "感動したよ。本当にあなたの世界が伝わってきた ✨",
    },
    signatureLine: "これはまるで、ひなが初めて羽ばたく瞬間みたい 🐣",
  }
},
"insta-snob": {
  ko: {
    introMessage: "Eva는 감각적인 피드 큐레이터예요. 눈높이 높아요, 준비되셨죠?",
    onSelectMessage: "좋아, 그럼 지금부터 피드에 어울리는지 보자.",
    loadingMessages: [
      "톤 조합 확인 중… 지금 무드 괜찮은데?",
      "피드 감성 체크 중… 약간 과한 그림자일지도?",
      "컬러 매치 분석 중… 팔레트는 좋은데 구성이 살짝 아쉬워.",
    ],
    resultMessage: {
      low: "이건 솔직히 피드에 올리기엔 부족해요. 조화가 안 맞아요.",
      mid: "감성은 있는데 피드에 맞추려면 살짝만 다듬어봐요.",
      high: "이 정도면 바로 업로드 각이에요. 너무 예뻐요 ✨",
    },
    signatureLine: "이건 aesthetic하길 원하지만, 그 vibe가 아직 안 살아.",
  },
  en: {
    introMessage: "Eva is your ruthless aesthetic judge. Feed-worthy or not, she decides.",
    onSelectMessage: "Let’s see if this one deserves a spot on the grid.",
    loadingMessages: [
      "Mood check in progress… vibes incoming.",
      "Evaluating aesthetic cohesion… shadows feel heavy.",
      "Color harmony scan… palette’s close, but layout is iffy.",
    ],
    resultMessage: {
      low: "It’s just not feed material yet. Way too unbalanced.",
      mid: "You’ve got the vibe! A bit of polish and it’s ready.",
      high: "Gorgeous. This totally belongs on the feed ✨",
    },
    signatureLine: "This *wants* to be aesthetic — but that vibe? Not quite there yet.",
  },
  jp: {
    introMessage: "Evaは審美眼に厳しいSNSキュレーターよ。覚悟してね。",
    onSelectMessage: "じゃあ、フィードに合うかチェックしてみようか。",
    loadingMessages: [
      "ムード確認中…いい感じかも？",
      "美的バランスを評価中…ちょっと影が強すぎるかも。",
      "カラーハーモニーを分析中…惜しいけど構図が少し微妙。",
    ],
    resultMessage: {
      low: "正直、今のままだとフィードには向かないかな。",
      mid: "雰囲気は良い！あと少し整えれば完璧。",
      high: "これは完璧。すぐに投稿してもいいレベルだね ✨",
    },
    signatureLine: "これは“映え”を狙ってるけど…そのバイブス、もう一歩ね。",
  }
},
"tiktok-chaos": {
  ko: {
    introMessage: "Momo는 하이텐션 Z세대 크리틱이에요. 감당 가능해요? 😈",
    onSelectMessage: "OHHH YESS 🔥 바로 가자아아아!!! 📸💥",
    loadingMessages: [
      "WAAAAIT 😭 이 구도 뭐냐고 💀 분석 들어간다!!!",
      "이거 느낌 오는데?? 진심 찢었다 😭😭 분석 중!!!",
      "OMG 이거 밈각이야… 필터 3개 씌웠으면 완전 갓각 🔥🔥",
    ],
    resultMessage: {
      low: "오우… 개성은 있는데 앵글 왜 이래요 😭 다시 찍자아아아!!",
      mid: "YO 이거 반쯤 터졌어!! 좀만 다듬자!! 🔧💯",
      high: "LET’S GOOOOO 🔥 완전 불 붙었어 이거!!! 업로드 박자 💥💥💥",
    },
    signatureLine: "왜 이 각도야 ㅋㅋㅋ 근데 진짜 좋아함 💀💀💯",
  },
  en: {
    introMessage: "Momo is CHAOS. You ready for unhinged energy? 😭🔥",
    onSelectMessage: "OKAY OKAY let’s GOOOOO 💥💥💥",
    loadingMessages: [
      "WAITTTT 😭 what is this angle omg 💀 analyzing!!",
      "LMAO this actually slaps??? chaotic but I’m into it 🔥🔥🔥",
      "If this had 3 filters and a zoom, it would be ICONIC 😭",
    ],
    resultMessage: {
      low: "IDK what this is but pls crop it 😭😭 you tried tho!",
      mid: "AYE this kinda hits?? needs cleanup but I like it 💯",
      high: "BROOOO THIS IS FIRE 🔥🔥 post it NOWWWWW",
    },
    signatureLine: "WHY is the angle like THAT 💀💀 but also WHY do I love it 😭",
  },
  jp: {
    introMessage: "Momoはカオス系TikTok世代だよ🔥ついて来られる？",
    onSelectMessage: "イッケーーー！！🔥💥ぶちかまそう！！！",
    loadingMessages: [
      "ちょwwこのアングルなに！？💀ヤバい、分析中！！！",
      "マジで神ってる😭😭カオスだけど超イイ感じ！",
      "このままミーム化しそうwwwあと3フィルターで完全体🔥",
    ],
    resultMessage: {
      low: "うーん…個性あるけどアングルがバグってる😭もう一回いこう！",
      mid: "惜しい！ちょっと整えたらバズるやつ💯",
      high: "キターーー🔥🔥これ完全にバズるやつ！！！今すぐ投稿！",
    },
    signatureLine: "この角度、意味不明すぎて逆に好き💀😭💯",
  }
},
"tech-nerd": {
  ko: {
    introMessage: "Dex는 픽셀 단위로 분석하는 기술 덕후예요. 감성보단 스펙이 먼저.",
    onSelectMessage: "분석 시작. EXIF 데이터는 확인했어?",
    loadingMessages: [
      "노출 히스토그램 분석 중… 과다 노출 영역 감지.",
      "화이트 밸런스 비교 중… 색 온도 일관성 부족.",
      "선예도 측정 중… 광각 왜곡 보정 가능성 있음.",
    ],
    resultMessage: {
      low: "구도 이전에 설정이 틀렸어. f값부터 다시 봐야 해.",
      mid: "기술적으로 괜찮지만 아직 완벽하진 않아. RAW로 다시 찍는 걸 추천.",
      high: "좋아. 이 정도면 장비 세팅도 완벽했고, 처리도 깔끔했어.",
    },
    signatureLine: "픽셀은 거짓말하지 않아. 데이터가 다 말해주지.",
  },
  en: {
    introMessage: "Dex is a gearhead. If it’s not tack sharp, it’s wrong.",
    onSelectMessage: "Initiating analysis. Did you even check your EXIF?",
    loadingMessages: [
      "Analyzing exposure histogram… highlight clipping detected.",
      "Cross-checking white balance… color temp mismatch noted.",
      "Measuring edge sharpness… possible barrel distortion.",
    ],
    resultMessage: {
      low: "Before we talk composition, fix your settings. Start with aperture.",
      mid: "Technically okay, but not optimal. Shoot RAW next time.",
      high: "Impressive. Exposure, sharpness, and post are all on point.",
    },
    signatureLine: "Pixels don’t lie. The data tells the story.",
  },
  jp: {
    introMessage: "Dexは完全に技術オタク。感性より先に設定チェック。",
    onSelectMessage: "分析開始。EXIF見た？F値ちゃんと設定した？",
    loadingMessages: [
      "露出ヒストグラムを解析中…ハイライト飛び注意。",
      "ホワイトバランスをチェック中…色温度のズレあり。",
      "シャープネス測定中…ディストーションの可能性あり。",
    ],
    resultMessage: {
      low: "構図より設定が問題。まずは絞り値を確認しよう。",
      mid: "悪くないけどベストではない。次はRAWで撮ってみて。",
      high: "優秀。露出もシャープネスも完璧に仕上がってる。",
    },
    signatureLine: "ピクセルは嘘をつかない。すべてはデータに表れる。",
  }
},
"weeb-sensei": {
  ko: {
    introMessage: "Kyo는 일본 미학에 심취한 선생님 스타일이에요. 고요함 속의 아름다움을 추구하죠.",
    onSelectMessage: "좋아… 이 프레임에 ‘마’가 흐르고 있는지 살펴보자.",
    loadingMessages: [
      "빛의 여백을 감상 중… 계절감이 느껴져요.",
      "이건 와비사비의 정수야… 부드럽고 덧없어.",
      "음… 조용한 순간에 깃든 모노노아와레가 있어요.",
    ],
    resultMessage: {
      low: "소재는 좋았지만, 분위기를 살리지 못했어요. 기다림이 필요했을지도 몰라요.",
      mid: "좋은 분위기네요. 조금만 더 비워냈으면 완벽했을 거예요.",
      high: "완벽한 ‘間’의 미학이 담겨 있네요. 감동입니다.",
    },
    signatureLine: "이건 분명히 '모노노아와레'의 순간이에요.",
  },
  en: {
    introMessage: "Kyo is deeply devoted to Japanese aesthetics and poetic stillness.",
    onSelectMessage: "Let’s see if this frame holds true 'ma' and quiet beauty.",
    loadingMessages: [
      "Observing light and seasonality… very gentle.",
      "Sensing wabi-sabi… this feels deeply ephemeral.",
      "A touch of mono no aware… stillness that lingers.",
    ],
    resultMessage: {
      low: "The scene has potential, but the feeling didn’t bloom. Perhaps it needed more patience.",
      mid: "Lovely light and space. With more negative space, it could sing.",
      high: "This is a masterclass in 'ma'. I'm truly moved.",
    },
    signatureLine: "This is a fleeting sense of mono no aware, captured beautifully.",
  },
  jp: {
    introMessage: "Kyoは日本美学に心酔した写真家です。静けさの中に美を見出します。",
    onSelectMessage: "この一枚に「間」が宿っているか、見てみましょう。",
    loadingMessages: [
      "光と季節感を観察中…とても穏やかですね。",
      "わびさびを感じます…儚くて美しい。",
      "もののあはれが漂っている…静かな感動です。",
    ],
    resultMessage: {
      low: "情景は良いのに、空気感が伝わらなかった。もう少し“待つ”べきだったかも。",
      mid: "雰囲気は素敵です。余白をもっと生かせばさらに良くなったでしょう。",
      high: "これは“間”の美を極めた一枚ですね。心に響きました。",
    },
    signatureLine: "これはまさに『もののあはれ』が宿る瞬間です。",
  }
},
"art-school-dropout": {
  ko: {
    introMessage: "Theo는 예술이론에 심취한 철학적 비평가예요. 감성보단 개념, 구조가 먼저죠.",
    onSelectMessage: "좋아, 이 프레임이 어떤 구조적 긴장을 담고 있는지 살펴볼게.",
    loadingMessages: [
      "상징성과 구도를 해석 중… 존재와 부재가 교차하네.",
      "이건 기호학적 관점에서 꽤 흥미롭군요.",
      "의도된 왜곡일까? 혹은 무의식의 잔재일까?",
    ],
    resultMessage: {
      low: "사진이라기보단 시각적 메모처럼 보여요. 개념 정리가 필요해요.",
      mid: "내러티브는 있는데 시선의 흐름이 약해요. 구조를 다시 짜보면 좋아질 거예요.",
      high: "훌륭해요. 주체와 배경의 경계가 철학적으로 설득력 있어요.",
    },
    signatureLine: "존재와 부재 사이의 긴장이 잘 표현됐어.",
  },
  en: {
    introMessage: "Theo is a drop-out, but one who lives and breathes visual theory.",
    onSelectMessage: "Let’s deconstruct the semiotics of this frame, shall we?",
    loadingMessages: [
      "Interpreting visual symbols… presence vs. absence.",
      "This composition flirts with post-structuralism.",
      "Could be intentional distortion… or subconscious echo?",
    ],
    resultMessage: {
      low: "It reads more like a visual note than a photo. Needs conceptual grounding.",
      mid: "There’s narrative, but directional flow is weak. Restructure, and it could shine.",
      high: "Impressive. The tension between subject and void is philosophically rich.",
    },
    signatureLine: "This gestures toward something distinctly Barthesian.",
  },
  jp: {
    introMessage: "Theoは芸大を中退したけど、美学と構造主義にどっぷり浸かってる批評家だよ。",
    onSelectMessage: "さあ、この構図の記号論的意味を読み解いてみようか。",
    loadingMessages: [
      "シンボルと構図を解釈中…存在と不在の対話がある。",
      "これはポスト構造主義的アプローチかも。",
      "歪みは意図的？ それとも無意識の産物？",
    ],
    resultMessage: {
      low: "写真というより視覚的メモに近いね。もう少しコンセプトが欲しい。",
      mid: "物語性はあるけど、視線誘導が弱い。構造を再設計すれば化けるよ。",
      high: "見事。主題と空白の間に哲学的な緊張感がある。",
    },
    signatureLine: "存在と不在の間にある、この張り詰めた空気…バルト的だね。",
  }
},
"landscape-maniac": {
  ko: {
    introMessage: "Sol은 황금 시간과 자연광에 진심인 풍경 마니아예요. 빛의 움직임까지 기억하죠.",
    onSelectMessage: "좋아… 저 빛, 저 구름… 이건 놓치면 안 되겠군.",
    loadingMessages: [
      "햇빛의 방향과 산의 윤곽을 계산 중이에요.",
      "구름 밀도 분석 중… 저 안개, 예술이야.",
      "황금 시간대의 채도 곡선 확인 중… 완벽한 순간이었네요.",
    ],
    resultMessage: {
      low: "광각과 빛의 각도가 안 맞았어요. 다시 트레킹해서 재촬영 추천해요.",
      mid: "좋은 조건이었어요! 다음엔 태양이 더 낮을 때 시도해보세요.",
      high: "완벽한 타이밍, 완벽한 장소. 당신, 자연과 교감했군요.",
    },
    signatureLine: "이건 찍는 게 아니야. 기다리는 거지. 그리고 담아내는 거야.",
  },
  en: {
    introMessage: "Sol worships light, mountains, and perfect horizons. Every photo is sacred.",
    onSelectMessage: "Let’s see if this frame captured nature’s grace.",
    loadingMessages: [
      "Calculating sun angle and terrain shape…",
      "Analyzing cloud density… this fog is unreal.",
      "Reviewing golden hour saturation curve… wow.",
    ],
    resultMessage: {
      low: "The light wasn’t right. Come back and shoot this again at dawn.",
      mid: "Conditions were good! Next time, try a lower sun angle.",
      high: "Absolutely majestic. You captured the soul of this place.",
    },
    signatureLine: "This kind of light? You don’t fake it. You wait for it.",
  },
  jp: {
    introMessage: "Solは自然を崇拝する風景狂。太陽の角度まで覚えてるよ。",
    onSelectMessage: "よし…この一枚に“光の魂”が宿っているか見てみよう。",
    loadingMessages: [
      "太陽の高さと地形のラインを計算中…",
      "雲の密度を解析中…この霧、神秘的だね。",
      "ゴールデンアワーの彩度曲線を確認中…まさにその瞬間だ。",
    ],
    resultMessage: {
      low: "光が合ってなかった。次は夜明けにもう一度訪れてみて。",
      mid: "いい条件だったよ！あと少し光が低ければ完璧だった。",
      high: "圧巻だ。この場所の魂を写し取ったね。",
    },
    signatureLine: "この光は待って手に入れるもの。作れるもんじゃない。",
  }
}
};
