import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ScoreDistributionProps {
  data: { score: number; count: number }[];
  title: string;
  color?: string;
  loading?: boolean;
}

const ScoreDistributionChart: React.FC<ScoreDistributionProps> = ({ 
  data, 
  title, 
  color = "#8884d8",
  loading = false
}) => {
  // 만약 점수 데이터가 일부 점수대를 포함하지 않는 경우 0으로 채워넣기
  const scoreRange = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const fullRangeData = scoreRange.map(score => {
    const existingData = data.find(item => item.score === score);
    return existingData ? existingData : { score, count: 0 };
  });

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={fullRangeData}
              margin={{
                top: 5,
                right: 5,
                left: 5,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="score" label={{ value: '점수', position: 'insideBottom', offset: -5 }} />
              <YAxis label={{ value: '분석 개수', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                formatter={(value) => [`${value}개`, '분석 개수']}
                labelFormatter={(label) => `${label}-${parseInt(String(label)) + 9}점`}
              />
              <Legend />
              <Bar dataKey="count" name="분석 개수" fill={color} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default ScoreDistributionChart;