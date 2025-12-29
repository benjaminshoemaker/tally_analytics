"use client";

import React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { date: string; count: number };

export default function PageViewsChart({ data }: { data: Point[] }) {
  return (
    <div className="rounded-lg border border-warm-200 bg-white p-4 shadow-warm transition-shadow hover:shadow-warm-md">
      <h2 className="text-sm font-semibold text-warm-900">Page views</h2>
      <div className="mt-3 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ec7f13" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ec7f13" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "#9a734c" }}
              axisLine={{ stroke: "#e8e0d9" }}
              tickLine={{ stroke: "#e8e0d9" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#9a734c" }}
              axisLine={{ stroke: "#e8e0d9" }}
              tickLine={{ stroke: "#e8e0d9" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e8e0d9",
                borderRadius: "6px",
                boxShadow: "0 4px 12px 0 rgba(40, 30, 20, 0.06)"
              }}
              labelStyle={{ color: "#1b140d", fontWeight: 600 }}
              itemStyle={{ color: "#ec7f13" }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#ec7f13"
              strokeWidth={2.5}
              fill="url(#colorCount)"
              dot={false}
              activeDot={{ r: 5, fill: "#ec7f13", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

