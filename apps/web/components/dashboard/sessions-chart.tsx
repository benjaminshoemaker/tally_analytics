"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { date: string; newSessions: number; returningSessions: number };

export default function SessionsChart({ data }: { data: Point[] }) {
  return (
    <div className="h-64 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-display text-sm font-semibold text-slate-900">Sessions over time</h2>
      <div className="mt-3 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="newSessions" stackId="a" fill="#0f172a" />
            <Bar dataKey="returningSessions" stackId="a" fill="#64748b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

