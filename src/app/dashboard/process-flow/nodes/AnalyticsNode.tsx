'use client';

import { memo, useState } from 'react';
import { NodeProps } from 'reactflow';
import BaseNode, { BaseNodeData } from './BaseNode';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CompletionRecord {
  completedAt: number;
  timeSpent: number;
  note?: string;
}

type TimePeriod = 'intraday' | 'day' | 'week' | 'month' | 'quarter';

interface AnalyticsNodeData extends BaseNodeData {
  completionHistory?: CompletionRecord[];
  timePeriod?: TimePeriod;
}

const formatTimeForDisplay = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const getTimePeriodData = (history: CompletionRecord[], period: TimePeriod) => {
  const now = Date.now();
  const periodMs = {
    intraday: 24 * 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    quarter: 90 * 24 * 60 * 60 * 1000,
  }[period];

  return history.filter(record => now - record.completedAt <= periodMs);
};

const processCompletionHistory = (history: CompletionRecord[] = [], timePeriod: TimePeriod = 'day') => {
  const periodHistory = getTimePeriodData(history, timePeriod);
  
  // Group by appropriate time unit based on period
  const groupedData = periodHistory.reduce((acc, record) => {
    const date = new Date(record.completedAt);
    let key;
    
    if (timePeriod === 'intraday') {
      key = `${date.getHours()}:${Math.floor(date.getMinutes() / 15) * 15}`;
    } else {
      key = date.toISOString().split('T')[0];
    }
    
    if (!acc[key]) {
      acc[key] = {
        date: key,
        timeSpent: 0,
        count: 0,
      };
    }
    
    acc[key].timeSpent += record.timeSpent;
    acc[key].count += 1;
    
    return acc;
  }, {} as Record<string, { date: string; timeSpent: number; count: number }>);

  // Convert to array and calculate averages
  const chartData = Object.values(groupedData).map(day => ({
    date: day.date,
    timeSpent: day.timeSpent / day.count,
  }));

  // Calculate statistics
  const allTimes = periodHistory.map(record => record.timeSpent);
  const averageTime = allTimes.length > 0 
    ? allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length 
    : 0;
  const maxTime = allTimes.length > 0 ? Math.max(...allTimes) : 0;
  const minTime = allTimes.length > 0 ? Math.min(...allTimes) : 0;
  const totalTime = allTimes.reduce((sum, time) => sum + time, 0);

  // Calculate recent improvement (last 3 entries vs previous 3)
  const recentImprovement = periodHistory.length >= 6
    ? (() => {
        const recent = periodHistory.slice(-3);
        const previous = periodHistory.slice(-6, -3);
        const recentAvg = recent.reduce((sum, r) => sum + r.timeSpent, 0) / 3;
        const previousAvg = previous.reduce((sum, r) => sum + r.timeSpent, 0) / 3;
        return ((previousAvg - recentAvg) / previousAvg) * 100;
      })()
    : 0;

  // Calculate overall improvement (first 3 vs last 3)
  const overallImprovement = periodHistory.length >= 6
    ? (() => {
        const first = periodHistory.slice(0, 3);
        const last = periodHistory.slice(-3);
        const firstAvg = first.reduce((sum, r) => sum + r.timeSpent, 0) / 3;
        const lastAvg = last.reduce((sum, r) => sum + r.timeSpent, 0) / 3;
        return ((firstAvg - lastAvg) / firstAvg) * 100;
      })()
    : 0;

  return {
    chartData,
    stats: {
      averageTime,
      maxTime,
      minTime,
      totalTime,
      recentImprovement,
      overallImprovement,
      totalCompletions: periodHistory.length,
    },
  };
};

export const AnalyticsNode = (props: NodeProps<AnalyticsNodeData>) => {
  const { data } = props;
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(data.timePeriod || 'day');
  const { chartData, stats } = processCompletionHistory(data.completionHistory, timePeriod);

  return (
    <div className="analytics-node">
      <BaseNode {...props} />
      <div className="mt-2 p-2">
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs text-gray-600">Time Period:</div>
          <div className="flex space-x-1">
            {(['intraday', 'day', 'week', 'month', 'quarter'] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`text-xs px-2 py-1 rounded ${
                  timePeriod === period
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => {
                  if (timePeriod === 'intraday') return date;
                  return new Date(date).toLocaleDateString();
                }}
              />
              <YAxis 
                tickFormatter={(ms) => formatTimeForDisplay(ms)}
              />
              <Tooltip 
                formatter={(value: number) => formatTimeForDisplay(value)}
                labelFormatter={(date) => {
                  if (timePeriod === 'intraday') return date;
                  return new Date(date).toLocaleDateString();
                }}
              />
              <Line 
                type="monotone" 
                dataKey="timeSpent" 
                stroke="#8884d8" 
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 text-xs text-gray-600 grid grid-cols-3 gap-2">
          <div>
            <div className="font-medium">Total Time</div>
            <div>{formatTimeForDisplay(stats.totalTime)}</div>
          </div>
          <div>
            <div className="font-medium">Avg Time</div>
            <div>{formatTimeForDisplay(stats.averageTime)}</div>
          </div>
          <div>
            <div className="font-medium">Max Time</div>
            <div>{formatTimeForDisplay(stats.maxTime)}</div>
          </div>
          <div>
            <div className="font-medium">Min Time</div>
            <div>{formatTimeForDisplay(stats.minTime)}</div>
          </div>
          <div>
            <div className="font-medium">Recent Impr.</div>
            <div className={stats.recentImprovement > 0 ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(stats.recentImprovement).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="font-medium">Overall Impr.</div>
            <div className={stats.overallImprovement > 0 ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(stats.overallImprovement).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="font-medium">Completions</div>
            <div>{stats.totalCompletions}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(AnalyticsNode); 