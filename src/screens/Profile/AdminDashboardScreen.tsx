import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import {
  collection,
  collectionGroup,
  getCountFromServer,
  getDocs,
  doc,
  setDoc,
  getDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@config/firebase";
import { colors } from "@config/theme";
import { t } from "@i18n/index";

interface MetricsSnapshot {
  date: string;
  users: number;
  households: number;
  wines: number;
  inventoryItems: number;
  diaryEntries: number;
  feedback: number;
}

type MetricKey = keyof Omit<MetricsSnapshot, "date">;

const METRIC_KEYS: MetricKey[] = [
  "users",
  "households",
  "wines",
  "inventoryItems",
  "diaryEntries",
  "feedback",
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function safeCount(ref: any): Promise<number> {
  try {
    const snap = await getCountFromServer(ref);
    return snap.data().count;
  } catch {
    return 0;
  }
}

async function fetchCurrentMetrics(): Promise<Omit<MetricsSnapshot, "date">> {
  const [users, households, wines, inventoryItems, diaryEntries, feedback] =
    await Promise.all([
      safeCount(collection(db, "users")),
      safeCount(collection(db, "households")),
      safeCount(collectionGroup(db, "wines")),
      safeCount(collectionGroup(db, "inventoryItems")),
      safeCount(collectionGroup(db, "diaryEntries")),
      safeCount(collection(db, "feedback")),
    ]);
  return { users, households, wines, inventoryItems, diaryEntries, feedback };
}

async function saveSnapshotIfNew(
  metrics: Omit<MetricsSnapshot, "date">
): Promise<void> {
  const date = todayStr();
  const ref = doc(db, "metrics_snapshots", date);
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    await setDoc(ref, { ...metrics, date, createdAt: serverTimestamp() });
  }
}

async function fetchHistory(): Promise<MetricsSnapshot[]> {
  const q = query(
    collection(db, "metrics_snapshots"),
    orderBy("date", "desc"),
    limit(14)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as MetricsSnapshot);
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <View style={spark.row}>
      {data.map((val, i) => (
        <View
          key={i}
          style={[
            spark.bar,
            { height: Math.max(3, Math.round((val / max) * 20)) },
            i === data.length - 1 && spark.today,
          ]}
        />
      ))}
    </View>
  );
}

const spark = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 22,
    marginTop: 8,
  },
  bar: {
    flex: 1,
    backgroundColor: colors.primary + "70",
    borderRadius: 2,
  },
  today: {
    backgroundColor: colors.gold,
  },
});

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  delta,
  trend,
}: {
  label: string;
  value: number;
  delta: number | null;
  trend: number[];
}) {
  const deltaColor =
    delta == null
      ? colors.textSecondary
      : delta > 0
      ? "#4caf50"
      : delta < 0
      ? colors.error
      : colors.textSecondary;

  return (
    <View style={card.wrap}>
      <Text variant="labelSmall" style={card.label} numberOfLines={1}>
        {label}
      </Text>
      <Text variant="headlineMedium" style={card.value}>
        {value.toLocaleString()}
      </Text>
      {delta != null && (
        <Text variant="labelSmall" style={[card.delta, { color: deltaColor }]}>
          {delta > 0 ? "+" : ""}
          {delta}
        </Text>
      )}
      <Sparkline data={trend.length > 0 ? trend : [value]} />
    </View>
  );
}

const card = StyleSheet.create({
  wrap: {
    width: "48%",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
  },
  label: {
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: 2,
  },
  value: {
    color: colors.gold,
    fontWeight: "bold",
    textAlign: "right",
  },
  delta: {
    textAlign: "right",
    marginTop: 1,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AdminDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<Omit<MetricsSnapshot, "date"> | null>(
    null
  );
  const [history, setHistory] = useState<MetricsSnapshot[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const metrics = await fetchCurrentMetrics();
      await saveSnapshotIfNew(metrics);
      const hist = await fetchHistory();
      setCurrent(metrics);
      setHistory(hist);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));

  const getTrend = (key: MetricKey): number[] =>
    sorted.map((s) => s[key] as number);

  const getDelta = (key: MetricKey): number | null => {
    if (history.length < 2) return null;
    const desc = [...history].sort((a, b) => b.date.localeCompare(a.date));
    return (desc[0][key] as number) - (desc[1][key] as number);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text
          variant="bodyMedium"
          style={{ color: colors.error, textAlign: "center", padding: 24 }}
        >
          {error}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.grid}>
        {METRIC_KEYS.map((key) => (
          <MetricCard
            key={key}
            label={t.adminMetricLabels[key]}
            value={(current?.[key] as number) ?? 0}
            delta={getDelta(key)}
            trend={getTrend(key)}
          />
        ))}
      </View>

      {history.length > 0 && (
        <>
          <Text variant="labelLarge" style={styles.sectionHeader}>
            {t.adminHistory}
          </Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHead]}>
              <Text style={[styles.cell, styles.headCell, styles.dateCol]}>
                {t.adminDate}
              </Text>
              {METRIC_KEYS.map((k) => (
                <Text
                  key={k}
                  style={[styles.cell, styles.headCell]}
                  numberOfLines={1}
                >
                  {t.adminMetricLabels[k]}
                </Text>
              ))}
            </View>
            {[...history]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((snap) => (
                <View key={snap.date} style={styles.tableRow}>
                  <Text
                    style={[
                      styles.cell,
                      styles.dateCol,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {snap.date.slice(5)}
                  </Text>
                  {METRIC_KEYS.map((k) => (
                    <Text key={k} style={styles.cell}>
                      {snap[k]}
                    </Text>
                  ))}
                </View>
              ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  sectionHeader: {
    color: colors.textSecondary,
    marginTop: 28,
    marginBottom: 12,
    textAlign: "right",
    letterSpacing: 0.5,
  },
  table: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tableHead: {
    backgroundColor: colors.surfaceVariant,
  },
  cell: {
    flex: 1,
    color: colors.text,
    textAlign: "center",
    fontSize: 10,
  },
  headCell: {
    color: colors.textSecondary,
    fontSize: 9,
  },
  dateCol: {
    flex: 1.2,
  },
});
