import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Trophy, TrendingUp, Target, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface Competitor {
  name: string;
  marketShare: number;
  listings: number;
  avgPrice: number;
  strength: string;
}

const competitors: Competitor[] = [];

const yourStrengths: { area: string; score: number; benchmark: number }[] = [];

export function CompetitiveAnalysis() {
  const yourRank = (() => {
    const idx = competitors.findIndex((c) => c.name === "You");
    return idx >= 0 ? idx + 1 : null;
  })();

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Competitive Analysis
          </CardTitle>
          <Badge className="bg-primary/20 text-primary">
            <Award className="w-3 h-3 mr-1" />
            Rank #{yourRank} in Market
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Market Share Comparison */}
        <div>
          <h4 className="text-sm font-medium mb-3">Market Share Comparison</h4>
          <div className="space-y-2">
            {competitors.map((comp, index) => (
              <div key={comp.name} className={cn(
                "p-3 rounded-lg",
                comp.name === "You" ? "bg-primary/10 border border-primary/30" : "bg-secondary/30"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      index === 0 ? "bg-amber-500 text-amber-950" :
                      index === 1 ? "bg-gray-400 text-gray-900" :
                      index === 2 ? "bg-amber-700 text-amber-100" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      {index + 1}
                    </span>
                    <span className={cn("font-medium", comp.name === "You" && "text-primary")}>
                      {comp.name}
                    </span>
                    {comp.name === "You" && (
                      <Badge variant="outline" className="text-xs">You</Badge>
                    )}
                  </div>
                  <span className="text-sm font-bold">{comp.marketShare}%</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{comp.listings} listings</span>
                  <span>Avg: ${(comp.avgPrice / 1000).toFixed(0)}K</span>
                  <span className="text-primary/70">{comp.strength}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Your Performance vs Benchmark */}
        <div>
          <h4 className="text-sm font-medium mb-3">Your Performance vs Market Average</h4>
          <div className="space-y-3">
            {yourStrengths.map((item) => (
              <div key={item.area}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">{item.area}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={cn(
                      "font-medium",
                      item.score >= item.benchmark ? "text-success" : "text-warning"
                    )}>
                      {item.score}%
                    </span>
                    <span className="text-muted-foreground">vs {item.benchmark}%</span>
                  </div>
                </div>
                <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="absolute h-full bg-muted-foreground/30 rounded-full"
                    style={{ width: `${item.benchmark}%` }}
                  />
                  <div 
                    className={cn(
                      "absolute h-full rounded-full",
                      item.score >= item.benchmark ? "bg-success" : "bg-warning"
                    )}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
