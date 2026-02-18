"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MessageDialog from "@/components/MessageDialog";
import { motion, AnimatePresence } from "framer-motion";
import { Suspense } from "react";

type Stage = "heaven" | "human" | "demon" | "extreme";
type Card = `c_${string}` | `s_${string}` | `d_${string}` | `h_${string}` | "j";

const jokerCountByStage: Record<Stage, number> = {
  heaven: 0,
  human: 0,
  demon: 4,
  extreme: 6,
};
function PlayInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const guessLock = useRef(false);

  const params = {
    players: searchParams.get("players"),
    stage: searchParams.get("stage"),
    start: searchParams.get("start"),
    add: searchParams.get("add"),
  };

  const [isFlipping, setIsFlipping] = useState(false);
  const [displayCard, setDisplayCard] = useState<string | null>(null);

  const [players, setPlayers] = useState<string[]>(() => {
    if (!params.players) return [];
    try {
      return JSON.parse(decodeURIComponent(params.players));
    } catch {
      return [];
    }
  });

  const [stage, setStage] = useState<Stage>(
    (params.stage as Stage) ?? "human"
  );
  const [startCups, setStartCups] = useState(Number(params.start) || 0);
  const [addPerRound, setAddPerRound] = useState(Number(params.add) || 0);

  const soundDraw = useRef<HTMLAudioElement | null>(null);
  const soundOK = useRef<HTMLAudioElement | null>(null);
  const soundNG = useRef<HTMLAudioElement | null>(null);
  const soundJoker = useRef<HTMLAudioElement | null>(null);
  const [openBackDialog, setOpenBackDialog] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  const [loser, setLoser] = useState<string | null>(null);

  useEffect(() => {
    const draw = new Audio("/audios/draw.mp3");
    const ok = new Audio("/audios/ok.mp3");
    const ng = new Audio("/audios/ng.mp3");
    const joker = new Audio("/audios/joker.mp3");

    [draw, ok, ng, joker].forEach((audio) => {
      audio.preload = "auto";
      audio.load();
    });

    soundDraw.current = draw;
    soundOK.current = ok;
    soundNG.current = ng;
    soundJoker.current = joker;
  }, []);

  const preloadImages = () => {
    const suits = ["c", "s", "d", "h"];
    const numbers = Array.from({ length: 13 }, (_, i) =>
      String(i + 1).padStart(2, "0")
    );

    const allCards = suits.flatMap((s) =>
      numbers.map((n) => `${s}_${n}`)
    );

    allCards.push("j", "t"); // joker と 山札

    allCards.forEach((card) => {
      const img = new Image();
      img.src = `/images/Trump/${card}.png`;
    });
    const explosion = new Image();
    explosion.src = "/images/explosion.png";
  };

  useEffect(() => {
    preloadImages();
  }, []);

  // ===== ゲーム状態 =====
  const [round, setRound] = useState(1);
  const [canGuess, setCanGuess] = useState(true);
  const [cups, setCups] = useState(0);

  const [deck, setDeck] = useState<Card[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [showJoker, setShowJoker] = useState(false);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  // ===== ステージ名マップ =====
  const stageNameMap: Record<Stage, string> = {
    heaven: "天界",
    human: "人間界",
    demon: "魔界",
    extreme: "極界",
  };
  const stageName = stageNameMap[stage];
  const currentPlayer = players.length > 0
    ? players[currentPlayerIndex % players.length]
    : "？？？";

  // ===== ユーティリティ =====
  const getCardValue = (card: Card): number | "joker" => {
    if (card === "j") return "joker";
    return Number(card.split("_")[1]);
  };

  const lookaheadByStage: Record<Stage, number> = {
    heaven: -1,
    human: 0,
    demon: 1,
    extreme: 2,
  };

  const getJudgementCard = (
    guess: "high" | "low",
    currentValue: number,
    startIndex: number
  ): { card: Card; bestIndex: number } => {
    const lookahead = lookaheadByStage[stage];
    if (lookahead <= 0) return { card: deck[startIndex], bestIndex: startIndex };

    const candidates = deck.slice(startIndex, startIndex + lookahead + 1);
    let bestIndex = startIndex;
    let bestValue = getCardValue(deck[startIndex]) as number;

    candidates.forEach((card, i) => {
      const value = getCardValue(card);
      if (value === "joker") return;
      const isBetter = guess === "high" ? value > bestValue : value < bestValue;
      if (isBetter) {
        bestValue = value;
        bestIndex = startIndex + i;
      }
    });

    return { card: deck[bestIndex], bestIndex };
  };

  const createDeck = (stage: Stage): Card[] => {
    const suits = ["c", "s", "d", "h"] as const;
    const numbers = Array.from({ length: 13 }, (_, i) =>
      String(i + 1).padStart(2, "0")
    );

    const baseDeck: Card[] = suits.flatMap((s) =>
      numbers.map((n) => `${s}_${n}` as Card)
    );
    const jokers: Card[] = Array(jokerCountByStage[stage]).fill("j");

    const build = (): Card[] => {
      const deck = [...baseDeck, ...jokers];
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      const extra = Array.from({ length: 10 }, () =>
        deck[Math.floor(Math.random() * deck.length)]
      );
      return [...deck, ...extra];
    };

    let deck = build();
    while (deck[0] === "j") deck = build();
    return deck;
  };

  // ===== 初回マウント =====
  useEffect(() => {
    setCups(startCups);
    const newDeck = createDeck(stage);
    setDeck(newDeck);
    setCurrentCard(newDeck[0]);
    setCardIndex(0);
  }, [stage]);

  // ===== Deck残り枚数監視 =====
  useEffect(() => {
    if (deck.length === 0) return;

    const remaining = deck.length - (cardIndex + 1);

    if (remaining <= 10) {
      const newDeck = createDeck(stage);

      setDeck(newDeck);
      setCardIndex(0);
      setCurrentCard(newDeck[0]);
    }
  }, [cardIndex, deck.length, stage]);

  // ===== 次のプレイヤーに進めるだけ =====
  const nextPlayer = () => {
    if (players.length === 0) return; // 空配列なら何もしない
    setCurrentPlayerIndex((prevIndex) => (prevIndex + 1) % players.length);
  };

  const playSafe = (audio?: HTMLAudioElement | null) => {
    if (!audio) return;

    try {
      audio.currentTime = 0;
      const p = audio.play();
      if (p !== undefined) {
        p.catch(() => {});
      }
    } catch {}
  };

  // ===== onGuess =====
  const onGuess = async (guess: "high" | "low") => {
    if (guessLock.current || !currentCard) return;

    guessLock.current = true;   // 即ロック
    setCanGuess(false);

    const wait = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));

    setCanGuess(false);

    // ===== ① まず次カードを確定させる =====
    const currentValueRaw = getCardValue(currentCard);
    const currentValue =
      currentValueRaw === "joker" ? 0 : currentValueRaw;

    const { card: nextCard, bestIndex } = getJudgementCard(
      guess,
      currentValue,
      cardIndex + 1
    );

    const nextValueRaw = getCardValue(nextCard);
    const isJoker = nextValueRaw === "joker";
    const nextValue = isJoker ? currentValue : (nextValueRaw as number);

    const isTie = nextValue === currentValue;
    const isHit =
      isJoker ||
      isTie ||
      (guess === "high"
        ? nextValue > currentValue
        : nextValue < currentValue);

    // ===== ② ドロー演出開始 =====
    playSafe(soundDraw.current);

    // 裏面を山札位置に出す
    setDisplayCard("back");

    await wait(250);

    // 表に切り替え（回転の途中）
    setDisplayCard(nextCard);

    await wait(250);

    // 演出カード消す
    setDisplayCard(null);

    // ===== ③ 実際のデータ更新 =====
    if (bestIndex !== cardIndex + 1) {
      const newDeck = [...deck];
      [newDeck[cardIndex + 1], newDeck[bestIndex]] =
        [newDeck[bestIndex], newDeck[cardIndex + 1]];
      setDeck(newDeck);
    }

    setCardIndex((prev) => prev + 1);
    if (!isJoker) setCurrentCard(nextCard);

    // ===== ④ ターン処理 =====
    if (isJoker) {
      playSafe(soundJoker.current);
      setShowJoker(true);
      setCups((c) => c * 2);

      setTimeout(() => {
        setShowJoker(false);
        nextPlayer();
        setCanGuess(true);
        guessLock.current = false;   // ←追加
      }, 3000);
    } else if (isHit) {
      playSafe(soundOK.current);
      await wait(1000);

      const isLastPlayer =
        currentPlayerIndex === players.length - 1;

      if (isLastPlayer) {
        setRound((r) => r + 1);
        setCups((c) => c + addPerRound);
      }

      nextPlayer();
      setCanGuess(true);
      guessLock.current = false;

    } else {
      playSafe(soundNG.current);
      setLoser(currentPlayer);
      setShowExplosion(true);

      setTimeout(() => {
        setShowExplosion(false);
      }, 2000);
    }
  };

  // ===== レンダリング =====
  const caps = (cups / 5).toFixed(1);

  return (
    <div style={{ padding: "24px", maxWidth: "480px", margin: "0 auto", backgroundColor: "#fde7ec", borderRadius: "16px", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.6rem", fontWeight: "bold", marginBottom: "12px", color: "#fa0238" }}>
        Round {round}
      </h1>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: "8px", fontSize: "1.2rem", fontWeight: "bold", marginBottom: "8px", color: "#6b3a44" }}>
        <span>負け犬は {cups} 杯 🍺</span>
        <span style={{ fontSize: "0.9rem", color: "#999" }}>（キャップ {caps} 杯）</span>
      </div>

      <div style={{ marginBottom: "20px", padding: "8px", borderRadius: "999px", backgroundColor: "#fff", boxShadow: "0 2px 6px rgba(233,107,138,0.2)", fontWeight: "bold", color: "#6b3a44" }}>
        {stageName} ステージ ： {addPerRound} 杯増し
      </div>

      <div
        style={{
          marginBottom: "20px",
          padding: "8px",
          borderRadius: "999px",
          backgroundColor: "#fff",
          boxShadow: "0 2px 6px rgba(233,107,138,0.2)",
          fontWeight: "bold",
          color: loser ? "#fa0238" : "#6b3a44",
        }}
      >
        {loser
          ? `${loser} の負け`
          : `${currentPlayer} のターン`}
      </div>

      <div
        style={{
          perspective: "1000px",
          position: "relative",
          height: "240px",
          borderRadius: "12px",
          backgroundColor: "#fff",
          border: "2px dashed #f3a1b3",
          marginBottom: "20px",
        }}
      >
        {/* 山札（左固定） */}
        <img
          src="/images/Trump/t.png"
          alt="山札"
          style={{
            position: "absolute",
            left: "60px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "120px",
            height: "180px",
            objectFit: "contain",
            opacity: 0.9,
          }}
        />

        {/* めくられるカード */}
        {displayCard && (
          <motion.img
            key={displayCard}
            src={
              displayCard === "back"
                ? "/images/Trump/t.png"
                : `/images/Trump/${displayCard}.png`
            }
            initial={{
              position: "absolute",
              left: "60px",
              top: "50%",
              translateY: "-50%",
              rotateY: 180,
              scale: 1,
              y: 0,
            }}
            animate={{
              left: "220px",
              rotateY: 0,
              scale: 1.05,
              y: -10,
            }}
            transition={{
              duration: 0.45,
              ease: [0.22, 1, 0.36, 1], // 超重要
            }}
            style={{
              width: "120px",
              height: "180px",
              objectFit: "contain",
              backfaceVisibility: "hidden",
              boxShadow: "0 15px 30px rgba(0,0,0,0.2)",
              zIndex: 20,
            }}
          />
        )}

        {/* 着地後の現在カード（右固定） */}
        {currentCard && (
          <img
            src={`/images/Trump/${currentCard}.png`}
            alt={currentCard}
            style={{
              position: "absolute",
              left: "220px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "120px",
              height: "180px",
              objectFit: "contain",
            }}
          />
        )}
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <button
          onClick={() => onGuess("high")}
          disabled={!canGuess}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "999px",
            border: "none",
            backgroundColor: canGuess ? "#ff9aa2" : "#ccc",
            color: "#fff",
            fontSize: "1.1rem",
            fontWeight: "bold",
            cursor: canGuess ? "pointer" : "not-allowed",
          }}
        >
          HIGH
        </button>

        <button
          onClick={() => onGuess("low")}
          disabled={!canGuess}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "999px",
            border: "none",
            backgroundColor: canGuess ? "#9aaeff" : "#ccc",
            color: "#fff",
            fontSize: "1.1rem",
            fontWeight: "bold",
            cursor: canGuess ? "pointer" : "not-allowed",
          }}
        >
          LOW
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <button
          onClick={() => setOpenBackDialog(true)}
          style={{
            padding: "10px",
            borderRadius: "999px",
            border: "1px solid #ccc",
            backgroundColor: "#fff",
            cursor: "pointer",
          }}
        >
          ⚙️ 設定ページに戻る
        </button>
        <button onClick={() => window.location.reload()} style={{ padding: "12px", borderRadius: "999px", border: "none", backgroundColor: "#e96b8a", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>🔁 もう一回遊べるドン！</button>
      </div>

      <AnimatePresence>
        {showExplosion && (
          <motion.div
            key="explosion-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background: "rgba(0,0,0,0.4)",
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              zIndex: 5000,
            }}
          >
            <motion.img
              src="/images/explosion.png"
              alt=""
              initial={{ scale: 0.2, opacity: 1 }}
              animate={{ scale: 2.5, opacity: 1 }}
              exit={{ scale: 3.2, opacity: 0 }}
              transition={{ duration: 2 }}
              style={{
                width: "80vw",
                maxWidth: "800px",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {showJoker && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, animation: "pulse 1.5s infinite" }}>
          <img src="/images/Trump/j.png" style={{ width: "60vw", maxWidth: "400px" }} />
        </div>
      )}

    <MessageDialog
      open={openBackDialog}
      title="一応確認するわ"
      message="逃げるの？"
      onConfirm={() => {
        const query = new URLSearchParams({
          players: JSON.stringify(players),
        }).toString();
        setOpenBackDialog(false);
        window.location.href = `/?${query}`;
      }}
      onCancel={() => setOpenBackDialog(false)}
    />

    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={null}>
      <PlayInner />
    </Suspense>
  );
}
