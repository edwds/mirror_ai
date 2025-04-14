import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface OpinionDialogProps {
  analysisId: number;
  existingOpinion?: {
    id: number;
    isLiked: boolean | null;
    comment: string | null;
  } | null;
  onOpinionSubmitted?: () => void;
}

export function OpinionDialog({ analysisId, existingOpinion, onOpinionSubmitted }: OpinionDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isLiked, setIsLiked] = useState<boolean | null>(existingOpinion?.isLiked || null);
  const [comment, setComment] = useState(existingOpinion?.comment || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 기존 의견이 변경되면 상태 업데이트
  useEffect(() => {
    if (existingOpinion) {
      setIsLiked(existingOpinion.isLiked);
      setComment(existingOpinion.comment || "");
    }
  }, [existingOpinion]);

  const handleSubmit = async () => {
    if (!isLiked && !comment) {
      toast({
        title: t("opinions.errorTitle") || "입력 오류",
        description: t("opinions.fillOneField") || "좋아요/싫어요를 선택하거나 의견을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest(
        `/api/analyses/${analysisId}/opinions`, 
        "POST",
        {
          isLiked,
          comment: comment || null,
        }
      );

      toast({
        title: t("opinions.thankYou") || "의견 제출 완료",
        description: t("opinions.submitted") || "소중한 의견 감사합니다.",
      });

      // 제출 완료 후 상태 업데이트를 위한 콜백 호출
      if (onOpinionSubmitted) {
        onOpinionSubmitted();
      }

      setIsOpen(false);
    } catch (error) {
      console.error("Error submitting opinion:", error);
      toast({
        title: t("opinions.errorTitle") || "오류 발생",
        description: t("opinions.submitFailed") || "의견 제출 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          className="text-slate-600 border-slate-300"
        >
          {t("analysis.leaveFeedback") || "의견 남기기"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("opinions.title") || "분석 결과에 대한 의견"}</DialogTitle>
          <DialogDescription>
            {t("opinions.description") || "분석 결과가 도움이 되었는지 알려주세요. 의견은 서비스 개선에 활용됩니다."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* 좋아요/싫어요 선택 */}
          <div className="flex justify-center gap-4">
            <Button
              type="button"
              variant={isLiked === true ? "default" : "outline"}
              onClick={() => setIsLiked(isLiked === true ? null : true)}
              className={`flex items-center gap-2 p-6 ${
                isLiked === true ? "bg-green-600 hover:bg-green-700" : ""
              }`}
            >
              <ThumbsUp className="h-5 w-5" />
              <span>{t("opinions.helpful") || "도움이 됐어요"}</span>
            </Button>
            <Button
              type="button"
              variant={isLiked === false ? "default" : "outline"}
              onClick={() => setIsLiked(isLiked === false ? null : false)}
              className={`flex items-center gap-2 p-6 ${
                isLiked === false ? "bg-red-600 hover:bg-red-700" : ""
              }`}
            >
              <ThumbsDown className="h-5 w-5" />
              <span>{t("opinions.notHelpful") || "도움이 안됐어요"}</span>
            </Button>
          </div>
          {/* 의견 입력 */}
          <div className="grid w-full gap-1.5">
            <label htmlFor="opinion" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t("opinions.commentLabel") || "의견 (선택사항)"}
            </label>
            <Textarea
              id="opinion"
              placeholder={t("opinions.commentPlaceholder") || "분석 결과에 대한 의견을 자유롭게 작성해주세요."}
              className="min-h-[100px]"
              value={comment || ""}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
            {t("common.cancel") || "취소"}
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting 
              ? (t("common.submitting") || "제출 중...") 
              : (existingOpinion 
                ? (t("common.update") || "수정하기") 
                : (t("common.submit") || "제출하기"))
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}