"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MessageDialog from "@/components/ErrorDialog";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function HomeInner() {

  type ConfigInput = {
    startCups: string;
    addPerRound: string;
  };
  const router = useRouter();
  const [config, setConfig] = useState<ConfigInput>({
    startCups: "",
    addPerRound: "",
  });
  const [backupPlayers, setBackupPlayers] = useState<string[]>([]);
  const [players, setPlayers] = useState<string[]>([]);
  const [playerCount, setPlayerCount] = useState(2);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  type Stage = "heaven" | "human" | "demon" | "extreme";
  const [stage, setStage] = useState<Stage>("human");
  const searchParams = useSearchParams();

  useEffect(() => {
    const playersParam = searchParams.get("players");
    if (!playersParam) return;

    try {
      const parsed = JSON.parse(playersParam) as string[];

      setPlayers(parsed);
      setPlayerCount(parsed.length);
    } catch {
      // 壊れてたら無視
    }
  }, [searchParams]);
  
  useEffect(() => {
    const saved = localStorage.getItem("resumePlayers");
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as { name: string }[];

      // 名前だけ取り出す
      const names = parsed.map(p => p.name);

      setPlayers(names);
      setPlayerCount(names.length);

      // 使い切りにしたいなら消す（任意）
      localStorage.removeItem("resumePlayers");
    } catch {
      // 壊れてたら無視
      localStorage.removeItem("resumePlayers");
    }
  }, []);

  const openPlayerDialog = () => {
    setBackupPlayers(players);

    const count = players.length > 0 ? players.length : 2;
    setPlayerCount(count);

    setPlayers((prev) => {
      const next = [...prev];
      while (next.length < count) next.push("");
      return next.slice(0, count);
    });

    setIsDialogOpen(true);
  };

  const removePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  const changePlayerCount = (count: number) => {
    setPlayerCount(count);

    setPlayers((prev) => {
      const next = [...prev];
      while (next.length < count) next.push("");
      return next.slice(0, count);
    });
  };

  const validatePlayers = (players: string[]) => {
    const trimmed = players.map((p) => p.trim());

    if (trimmed.length < 2) {
      throw new Error("その人数でどうやって遊ぶん？");
    }

    if (trimmed.some((p) => p === "")) {
      throw new Error("名前ないやついる！");
    }

    if (new Set(trimmed).size !== trimmed.length) {
      throw new Error("同じ名前のやついる！");
    }

    return trimmed;
  };  

  const startGame = () => {
    try {
      const validatedPlayers = validatePlayers(players);

      const start = Number(config.startCups);
      const add = Number(config.addPerRound);

      if (isNaN(start) || isNaN(add)) {
        throw new Error("杯数が数字じゃない！");
      }

      // 0 の場合も弾く
      if (start <= 0 || add <= 0) {
        throw new Error("スタートや増加が0とか、ヒヨってる？");
      }

      // クエリに詰める（配列は JSON）
      router.push(
        `/play?players=${encodeURIComponent(
          JSON.stringify(validatedPlayers)
        )}&start=${start}&add=${add}&stage=${stage}`
      );
    } catch (e) {
      if (e instanceof Error) {
        setErrorMessage(e.message);
      }
    }
  };
  
  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "480px",
        margin: "0 auto",
        backgroundColor: "#fde7ec",
        borderRadius: "16px",
      }}
    >
      <h1
        style={{
          fontSize: "1.4rem",
          fontWeight: "bold",
          marginBottom: "20px",
          textAlign: "center",
          color: "#fa0238",
          borderBottom: "2px solid #f3a1b3",
          borderTop: "2px solid #f3a1b3",
        }}
      >
        High & Low
      </h1>

      {/* ▼▼▼ プレイヤー管理 ▼▼▼ */}
      <div
        style={{
          margin: "24px auto",
          padding: "16px 20px",
          maxWidth: "420px",
          borderRadius: "12px",
          border: "1px solid #ddd",
          backgroundColor: "#fff",
        }}
      >
        <div
          style={{
            fontSize: "1.2rem",
            fontWeight: "bold",
            marginBottom: "12px",
            paddingBottom: "6px",
            borderBottom: "1px dashed #f3a1b3",
            color: "#6b3a44",
            textAlign: "center",
          }}
        >
          プレイヤー管理
        </div>

        <button
          onClick={openPlayerDialog}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "999px",
            border: "none",
            backgroundColor: "#e96b8a",
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer",
            marginBottom: "12px",
          }}
        >
          ＋ プレイヤーを追加
        </button>

        {/* プレイヤー一覧 */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "12px",
            justifyContent: "center",
          }}
        >
          {players.length === 0 ? (
            <span style={{ color: "#aaa" }}>まだプレイヤーがいません</span>
          ) : (

            players.map((player, index) => (
              <div
                key={index}
                style={{
                  position: "relative", 
                  padding: "6px 28px 6px 12px",
                  borderRadius: "999px",
                  backgroundColor: "#fde7ec",
                  border: "1px solid #f3a1b3",
                  color: "#6b3a44",
                  fontWeight: "bold",
                  boxShadow: "0 2px 4px rgba(233,107,138,0.2)",
                }}
              >
                {player}

                {/* 削除ボタン */}
                <button
                  onClick={() => removePlayer(index)}
                  style={{
                    position: "absolute",
                    top: "50%",
                    right: "8px",
                    transform: "translateY(-50%)",
                    border: "none",
                    background: "transparent",
                    color: "#b44562",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: "14px",
                    lineHeight: 1,
                  }}
                  aria-label={`${player}を削除`}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

      </div>

      {/* ▼▼▼ ゲーム設定 ▼▼▼ */}
      <div
        style={{
          marginTop: "16px",
          padding: "12px 16px",
          borderRadius: "12px",
          border: "1px dashed #f3a1b3",
          backgroundColor: "#fde7ec",
        }}
      >
        <div
          style={{
            fontSize: "1.2rem",
            fontWeight: "bold",
            paddingBottom: "6px",
            borderBottom: "1px dashed #f3a1b3",
            color: "#6b3a44",
            textAlign: "center",
          }}
        >
          ゲーム設定
        </div>

        <div style={{ paddingTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              borderRadius: "10px",
              backgroundColor: "#fff",
              boxShadow: "0 2px 6px rgba(233,107,138,0.15)",
            }}
          >
            <span style={{ width: "96px", fontWeight: "bold", color: "#6b3a44" }}>🌸 スタート</span>
            <div style={{ display: "flex", alignItems: "center", gap: "36px" }}>
              <input
                type="text"
                inputMode='numeric'
                value={config.startCups}
                placeholder="0"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value)) {
                      setConfig({ ...config, startCups: value });
                    }
                  }}            
                className="config-input"
              />
              <span style={{ color: "#6b3a44", fontWeight: "bold" }}>杯</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              borderRadius: "10px",
              backgroundColor: "#fff",
              boxShadow: "0 2px 6px rgba(233,107,138,0.15)",
            }}
          >
            <span style={{ width: "96px", fontWeight: "bold", color: "#6b3a44" }}>🌸 増 加</span>
            <div style={{ display: "flex", alignItems: "center", gap: "36px" }}>
              <input
                type="text"
                inputMode='numeric'
                value={config.addPerRound}
                placeholder="0"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value)) {
                      setConfig({ ...config, addPerRound: value });
                    }
                  }}            
                className="config-input"
              />
              <span style={{ color: "#6b3a44", fontWeight: "bold" }}>杯</span>
            </div>
          </div>
          {/* ▼▼▼ ステージ選択 ▼▼▼ */}
          <div
            style={{
              marginTop: "24px",
              paddingTop: "12px",
              borderTop: "1px dashed #f3a1b3",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                color: "#6b3a44",
                marginBottom: "12px",
                textAlign: "center",
              }}
            >
              🎭 ステージ
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              {[
                { label: "天界", value: "heaven" },
                { label: "人間界", value: "human" },
                { label: "魔界", value: "demon" },
                { label: "極界", value: "extreme" },
              ].map((s) => (
                <label
                  key={s.value}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "8px 4px",
                    borderRadius: "999px",
                    border: stage === s.value ? "2px solid #e96b8a" : "1px solid #ccc",
                    backgroundColor: stage === s.value ? "#fde7ec" : "#fff",
                    cursor: "pointer",
                    fontWeight: "bold",
                    color: "#6b3a44",
                    fontSize: "0.9rem",
                  }}
                >
                  <input
                    type="radio"
                    name="stage"
                    value={s.value}
                    checked={stage === s.value}
                    onChange={() => setStage(s.value as Stage)}
                    style={{ display: "none" }}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            alignItems: "center",
          }}
        >
          <button
            onClick={startGame}
            className="start-button"
          >
            😈 スタート 😇
          </button>

        </div>        
      </div>

      {isDialogOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "90%",
              maxWidth: "360px",
              backgroundColor: "#fff",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            }}
          >
            {/* タイトル */}
            <div
              style={{
                fontSize: "1.2rem",
                fontWeight: "bold",
                textAlign: "center",
                marginBottom: "16px",
                color: "#6b3a44",
              }}
            >
              👼 プレイヤーを追加
            </div>

          {/* 人数選択 */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontWeight: "bold",
                color: "#6b3a44",
                marginBottom: "8px",
              }}
            >
              👥 人数を選択
            </div>

            <select
              value={playerCount}
              onChange={(e) => changePlayerCount(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
            >
              {[...Array(9)].map((_, i) => {
                const n = i + 2;
                return (
                  <option key={n} value={n}>
                    {n} 人
                  </option>
                );
              })}
            </select>
          </div>

          {/* 名前入力 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {players.map((name, index) => (
              <input
                key={index}
                type="text"
                placeholder={`プレイヤー${index + 1}`}
                value={name}
                onChange={(e) => {
                  const next = [...players];
                  next[index] = e.target.value;
                  setPlayers(next);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                  backgroundColor: "#fff",
                }}
              />
            ))}
          </div>

            {/* ボタン */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginTop: "16px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => {
                  setPlayers(backupPlayers);
                  setIsDialogOpen(false);
                }}
                style={{
                  padding: "10px",
                  borderRadius: "999px",
                  border: "1px solid #ccc",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                }}
              >
                キャンセル
              </button>

              <button
                onClick={() => {
                  try {
                    validatePlayers(players);
                    setIsDialogOpen(false);
                  } catch (e) {
                    if (e instanceof Error) {
                      setErrorMessage(e.message);
                    }
                  }
                }}
                style={{
                  padding: "10px 22px",
                  borderRadius: "999px",
                  border: "none",
                  backgroundColor: "#e96b8a",
                  color: "#fff",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                完了
              </button>
            </div>
          </div>
        </div>
      )}

      <MessageDialog
        open={errorMessage !== null}
        title="えらーーー！"
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
      />

    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}
