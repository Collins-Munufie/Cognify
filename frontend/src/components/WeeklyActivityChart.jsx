import React from 'react';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function WeeklyActivityChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--brand-primary, #FF8243)" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="var(--brand-primary, #FF8243)" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="5 5" stroke="var(--brand-border)" opacity={0.3} vertical={false} />
        <XAxis 
          dataKey="name" 
          stroke="var(--brand-muted)" 
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: 'var(--brand-muted)' }} 
        />
        <YAxis 
          stroke="var(--brand-muted)" 
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: 'var(--brand-muted)' }} 
        />
        <RechartsTooltip 
          contentStyle={{ 
            backgroundColor: 'var(--brand-surface)', 
            borderColor: 'var(--brand-border)', 
            borderRadius: '16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            color: 'var(--brand-text)'
          }} 
          itemStyle={{ color: 'var(--brand-primary)' }}
        />
        <Area 
          type="monotone" 
          dataKey="sessions" 
          stroke="var(--brand-primary, #FF8243)" 
          strokeWidth={3}
          fillOpacity={1} 
          fill="url(#colorSessions)" 
          activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--brand-primary)' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
