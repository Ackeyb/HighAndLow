"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Stage = "heaven" | "human" | "demon" | "extreme";
type Card = `c_${string}` | `s_${string}` | `d_${string}` | `h_${string}` | "j";

const jokerCountByStage: Record<Stage, number> = {
  heaven: 0,
  human: 0,
  demon: 4,
  extreme: 6,
};

export default function PlayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ===== クエリ関連（useEffect内で初期化） =====
  const [players, setPlayers] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage>("human");
  const [startCups, setStartCups] = useState(0);
  const [addPerRound, setAddPerRound] = useState(0);

  useEffect(() => {
    const playersParam = searchParams.get("players");
    const stageParam = searchParams.get("stage");
    const startParam = searchParams.get("start");
    const addParam = searchParams.get("add");

    if (playersParam) setPlayers(JSON.parse(decodeURIComponent(playersParam)));
    if (
      stageParam === "heaven" ||
      stageParam === "human" ||
      stageParam === "demon" ||
      stageParam === "extreme"
    ) {
      setStage(stageParam);
    }
    if (startParam) setStartCups(Number(startParam));
    if (addParam) setAddPerRound(Number(addParam));
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

  // ===== 次のプレイヤーに進めるだけ =====
  const nextPlayer = () => {
    setCurrentPlayerIndex((prevIndex) => (prevIndex + 1) % players.length);
  };

  // ===== onGuess =====
  const onGuess = (guess: "high" | "low") => {
    if (!canGuess || !currentCard) return;

    const currentValueRaw = getCardValue(currentCard);
    const currentValue: number = currentValueRaw === "joker" ? 0 : currentValueRaw;

    const { card: nextCard, bestIndex } = getJudgementCard(
      guess,
      currentValue,
      cardIndex + 1
    );

    const nextValueRaw = getCardValue(nextCard);
    const isJoker = nextValueRaw === "joker";
    const nextValue: number = isJoker ? currentValue : (nextValueRaw as number);

    const isTie = nextValue === currentValue;
    const isHit =
      isJoker || isTie || (guess === "high" ? nextValue > currentValue : nextValue < currentValue);

    // ---- swap deck ----
    if (bestIndex !== cardIndex + 1) {
      const newDeck = [...deck];
      [newDeck[cardIndex + 1], newDeck[bestIndex]] = [newDeck[bestIndex], newDeck[cardIndex + 1]];
      setDeck(newDeck);
    }

    // ---- カード更新 ----
    setCardIndex(cardIndex + 1);
    if (!isJoker) setCurrentCard(nextCard);

    // ---- ターン終了処理 ----
    if (isJoker) {
      setShowJoker(true);
      setCups((c) => c * 2);
      setCanGuess(false);
      setTimeout(() => {
        setShowJoker(false);
        nextPlayer(); // Index だけ更新
        setCanGuess(true);
      }, 3000);
    } else if (isHit) {
      // プレイヤーが一周したかチェック
      const isLastPlayer = currentPlayerIndex === players.length - 1;
      if (isLastPlayer) {
        setRound((r) => r + 1);
        setCups((c) => c + addPerRound);
      }

      nextPlayer(); // Index だけ更新
      setCanGuess(true);
    } else {
      setCanGuess(false);
    }
  };

  // ===== レンダリング =====
  const caps = Math.floor(cups / 5);

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

      <div style={{ marginBottom: "20px", padding: "8px", borderRadius: "999px", backgroundColor: "#fff", boxShadow: "0 2px 6px rgba(233,107,138,0.2)", fontWeight: "bold", color: "#6b3a44" }}>
         {currentPlayer} のターン
      </div>

      <div style={{ height: "240px", borderRadius: "12px", backgroundColor: "#fff", border: "2px dashed #f3a1b3", display: "flex", alignItems: "center", justifyContent: "center", gap: "24px", marginBottom: "20px" }}>
        <img src="/images/Trump/t.png" alt="山札" style={{ width: "120px", height: "180px", objectFit: "contain", opacity: 0.9 }} />
        {currentCard ? (
          <img src={`/images/Trump/${currentCard}.png`} alt={currentCard} style={{ width: "120px", height: "180px", objectFit: "contain" }} />
        ) : (
          <div style={{ width: "120px", height: "180px", display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontWeight: "bold" }}>
            🂠 読み込み中
          </div>
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
        <button onClick={() => router.push("/")} style={{ padding: "10px", borderRadius: "999px", border: "1px solid #ccc", backgroundColor: "#fff", cursor: "pointer" }}>⚙️ 設定ページに戻る</button>
        <button onClick={() => window.location.reload()} style={{ padding: "12px", borderRadius: "999px", border: "none", backgroundColor: "#e96b8a", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>🔁 もう一回遊べるドン！</button>
      </div>

      {showJoker && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, animation: "pulse 1.5s infinite" }}>
          <img src="/images/Trump/j.png" style={{ width: "60vw", maxWidth: "400px" }} />
        </div>
      )}

    </div>
  );
}
