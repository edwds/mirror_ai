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

interface GenreScoreProps {
  data: { genre: string; averageScore: number }[];
  title: string;
  loading?: boolean;
}

const GenreScoreChart: React.FC<GenreScoreProps> = ({ 
  data, 
  title,
  loading = false 
}) => {
  // 데이터 정렬 (평균 점수 기준 내림차순)
  const sortedData = [...data]
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 15); // 상위 15개 장르만 표시
    
  // 평균 점수를 정수로 반올림
  const formattedData = sortedData.map(item => ({
    ...item,
    averageScore: Math.round(item.averageScore)
  }));

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
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={formattedData}
              layout="vertical"
              margin={{
                top: 5,
                right: 30,
                left: 100, // 장르 이름을 표시하기 위해 충분한
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                domain={[0, 100]}
                label={{ value: '평균 점수', position: 'insideBottom', offset: -5 }} 
              />
              <YAxis 
                dataKey="genre" 
                type="category" 
                tick={{ fontSize: 12 }}
                width={100}
              />
              <Tooltip
                formatter={(value) => [`${value}점`, '평균 점수']}
              />
              <Legend />
              <Bar 
                dataKey="averageScore" 
                name="평균 점수" 
                fill="#8884d8" 
                label={{ 
                  position: 'right',
                  formatter: (value: any) => `${value}점`,
                  fill: '#666',
                  fontSize: 12
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default GenreScoreChart;