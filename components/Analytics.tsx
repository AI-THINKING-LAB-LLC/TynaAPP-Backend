
import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Users, TrendingUp, BarChart3, X } from 'lucide-react';
import { MeetingStatistics } from '../types';
// import { getMeetingStatistics } from '../services/laravelDataService';

interface AnalyticsProps {
  onClose?: () => void;
}

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const Analytics: React.FC<AnalyticsProps> = ({ onClose }) => {
  const [statistics, setStatistics] = useState<MeetingStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    const loadStatistics = async () => {
      setLoading(true);
      const stats = await getMeetingStatistics();
      setStatistics(stats);
      setLoading(false);
    };
    loadStatistics();
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#2A66FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  const maxMeetings = Math.max(...statistics.meetingsByDay.map(d => d.count), 1);
  const maxDuration = Math.max(...statistics.meetingsByDay.map(d => d.totalDuration), 1);

  return (
    <div className="h-screen bg-[#F9FAFB] overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 size={24} className="text-[#2A66FF]" />
            <h1 className="text-[24px] font-semibold text-[#111]">Analytics & Statistics</h1>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Meetings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar size={24} className="text-[#2A66FF]" />
              </div>
            </div>
            <div className="text-[32px] font-bold text-[#111] mb-1">{statistics.totalMeetings}</div>
            <div className="text-[14px] text-gray-500">Total Meetings</div>
          </div>

          {/* Total Time */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock size={24} className="text-green-600" />
              </div>
            </div>
            <div className="text-[32px] font-bold text-[#111] mb-1">{formatTime(statistics.totalTimeSeconds)}</div>
            <div className="text-[14px] text-gray-500">Total Time</div>
          </div>

          {/* Average Duration */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={24} className="text-purple-600" />
              </div>
            </div>
            <div className="text-[32px] font-bold text-[#111] mb-1">{formatTime(statistics.averageDurationSeconds)}</div>
            <div className="text-[14px] text-gray-500">Average Duration</div>
          </div>

          {/* This Period */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <BarChart3 size={24} className="text-orange-600" />
              </div>
            </div>
            <div className="text-[32px] font-bold text-[#111] mb-1">
              {period === 'day' ? statistics.meetingsByPeriod.today :
               period === 'week' ? statistics.meetingsByPeriod.thisWeek :
               statistics.meetingsByPeriod.thisMonth}
            </div>
            <div className="text-[14px] text-gray-500">
              {period === 'day' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}
            </div>
          </div>
        </div>

        {/* Period Selector */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod('day')}
              className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${
                period === 'day' 
                  ? 'bg-[#2A66FF] text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${
                period === 'week' 
                  ? 'bg-[#2A66FF] text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${
                period === 'month' 
                  ? 'bg-[#2A66FF] text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              This Month
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Meetings by Day Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-[18px] font-semibold text-[#111] mb-4">Meetings by Day (Last 30 Days)</h2>
            <div className="space-y-3">
              {statistics.meetingsByDay.map((day, index) => {
                const date = new Date(day.date);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNumber = date.getDate();
                const width = (day.count / maxMeetings) * 100;
                
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-16 text-[12px] text-gray-500 text-right">
                      {dayName} {dayNumber}
                    </div>
                    <div className="flex-1 relative">
                      <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2A66FF] rounded-full transition-all"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-[#111]">
                        {day.count > 0 && `${day.count} meeting${day.count > 1 ? 's' : ''}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time by Day Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-[18px] font-semibold text-[#111] mb-4">Time Spent by Day (Last 30 Days)</h2>
            <div className="space-y-3">
              {statistics.meetingsByDay.map((day, index) => {
                const date = new Date(day.date);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNumber = date.getDate();
                const width = (day.totalDuration / maxDuration) * 100;
                
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-16 text-[12px] text-gray-500 text-right">
                      {dayName} {dayNumber}
                    </div>
                    <div className="flex-1 relative">
                      <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-[#111]">
                        {day.totalDuration > 0 && formatTime(day.totalDuration)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Participants */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Users size={20} className="text-[#2A66FF]" />
              <h2 className="text-[18px] font-semibold text-[#111]">Top Participants</h2>
            </div>
            {statistics.topParticipants.length > 0 ? (
              <div className="space-y-3">
                {statistics.topParticipants.map((participant, index) => {
                  const maxCount = statistics.topParticipants[0]?.count || 1;
                  const width = (participant.count / maxCount) * 100;
                  
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2A66FF] text-white flex items-center justify-center text-[12px] font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[14px] font-medium text-[#111]">{participant.name}</span>
                          <span className="text-[13px] text-gray-500">{participant.count} meetings</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2A66FF] rounded-full"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-[14px] text-center py-8">No participant data available</p>
            )}
          </div>

          {/* Top Keywords */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-[#2A66FF]" />
              <h2 className="text-[18px] font-semibold text-[#111]">Most Discussed Topics</h2>
            </div>
            {statistics.topKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {statistics.topKeywords.map((keyword, index) => {
                  const maxCount = statistics.topKeywords[0]?.count || 1;
                  const intensity = (keyword.count / maxCount) * 100;
                  const bgOpacity = Math.max(20, intensity / 5);
                  
                  return (
                    <div
                      key={index}
                      className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-all hover:scale-105"
                      style={{
                        backgroundColor: `rgba(42, 102, 255, ${bgOpacity / 100})`,
                        color: intensity > 50 ? 'white' : '#2A66FF'
                      }}
                    >
                      {keyword.word} ({keyword.count})
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-[14px] text-center py-8">No keyword data available</p>
            )}
          </div>
        </div>

        {/* Period Summary */}
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-[18px] font-semibold text-[#111] mb-4">Period Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-[12px] text-gray-500 mb-1">Today</div>
              <div className="text-[20px] font-bold text-[#111]">{statistics.meetingsByPeriod.today} meetings</div>
              <div className="text-[14px] text-gray-500">{formatTime(statistics.timeByPeriod.today)}</div>
            </div>
            <div>
              <div className="text-[12px] text-gray-500 mb-1">This Week</div>
              <div className="text-[20px] font-bold text-[#111]">{statistics.meetingsByPeriod.thisWeek} meetings</div>
              <div className="text-[14px] text-gray-500">{formatTime(statistics.timeByPeriod.thisWeek)}</div>
            </div>
            <div>
              <div className="text-[12px] text-gray-500 mb-1">This Month</div>
              <div className="text-[20px] font-bold text-[#111]">{statistics.meetingsByPeriod.thisMonth} meetings</div>
              <div className="text-[14px] text-gray-500">{formatTime(statistics.timeByPeriod.thisMonth)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};





