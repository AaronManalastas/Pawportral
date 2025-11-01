"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";

type Props = {
  title: string;
  kind: "line" | "bar";
  data: any[];
  xKey: string;
  yKey: string;
};

export default function ChartCard({ title, kind, data, xKey, yKey }: Props) {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-white/5 shadow-sm border border-gray-100 dark:border-white/10 h-80">
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{title}</div>
      <ResponsiveContainer width="100%" height="90%">
        {kind === "line" ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey={yKey} />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Bar dataKey={yKey} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
