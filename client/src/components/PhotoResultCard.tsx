import React, { useEffect, useState } from "react";
import { Star, Camera } from "lucide-react";
import { AnalysisResult } from "@shared/schema";
import { useTranslation } from "react-i18next";

interface PhotoResultCardProps {
  result: AnalysisResult;
  imageSrc: string;
  firebaseDisplayUrl?: string;
  base64DisplayImage?: string;
  displayImagePath?: string;
  replitDisplayUrl?: string;
  s3DisplayUrl?: string;
  cameraInfo?: string;
}

type AspectRatioOption = "4:5" | "1:1" | "3:2";

const PhotoResultCard: React.FC<PhotoResultCardProps> = ({
  result,
  imageSrc,
  firebaseDisplayUrl,
  base64DisplayImage,
  displayImagePath,
  replitDisplayUrl,
  s3DisplayUrl,
  cameraInfo,
}) => {
  const { t } = useTranslation();
  const { summary, overallScore, tags } = result;
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>("3:2");

  // Calculate star rating (100 points to 5 stars)
  const starRating = Math.round((overallScore / 100) * 5 * 2) / 2; // 0.5 increment
  const fullStars = Math.floor(starRating);
  const hasHalfStar = starRating % 1 !== 0;
  
  // Detect image aspect ratio on load
  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        const ratio = width / height;
        
        // Determine the closest aspect ratio
        if (ratio > 1.4) { // Landscape
          setAspectRatio("3:2");
        } else if (ratio < 0.75) { // Portrait
          setAspectRatio("4:5");
        } else { // Close to square
          setAspectRatio("1:1");
        }
      };
      img.src = imageSrc;
    }
  }, [imageSrc]);
  
  // Determine aspect ratio class
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case "4:5":
        return "aspect-[4/5] md:aspect-[3/4] lg:aspect-[4/5]";
      case "1:1":
        return "aspect-square md:aspect-[4/3] lg:aspect-square";
      case "3:2":
      default:
        return "aspect-[3/2] md:aspect-[4/3] lg:aspect-[3/2]";
    }
  };

  return (
    <div className="w-full overflow-hidden bg-white border border-slate-200 rounded-xl shadow-md">
      <div className="relative">
        {/* Image with minimal overlay and dynamic aspect ratio */}
        <div className={`${getAspectRatioClass()} overflow-hidden relative`}>
          <img
            src={imageSrc}
            alt="Analyzed photograph"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              console.log("Image load error in PhotoResultCard:", imageSrc);
              
              // Priority-based fallback mechanism
              if (target.src === imageSrc && firebaseDisplayUrl) {
                console.log("Primary source load failed, trying Firebase URL");
                target.src = firebaseDisplayUrl;
              } 
              else if ((target.src === imageSrc || target.src === firebaseDisplayUrl) && base64DisplayImage) {
                console.log("Firebase URL load failed, trying base64 image");
                target.src = base64DisplayImage;
              }
              else if ((target.src === imageSrc || target.src === firebaseDisplayUrl || target.src === base64DisplayImage) 
                      && displayImagePath) {
                console.log("Base64 image load failed, trying local file path as URL");
                const host = window.location.origin;
                target.src = `${host}${displayImagePath}`;
              }
              else if ((target.src === imageSrc || target.src === firebaseDisplayUrl || target.src === base64DisplayImage 
                      || target.src === displayImagePath) && replitDisplayUrl) {
                console.log("Local file path load failed, trying Replit URL");
                target.src = replitDisplayUrl;
              }
              else if ((target.src === imageSrc || target.src === firebaseDisplayUrl || target.src === base64DisplayImage 
                      || target.src === displayImagePath || target.src === replitDisplayUrl) 
                      && s3DisplayUrl) {
                console.log("Replit URL load failed, trying S3 URL");
                target.src = s3DisplayUrl;
              }
              else {
                // Use placeholder when all methods fail
                console.log("All image sources failed, using placeholder");
                target.src = "https://placehold.co/800x600/e2e8f0/64748b?text=Image+unavailable";
                target.classList.add("bg-gray-200");
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent"></div>
          
          {/* Score badge */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm flex items-center px-3 py-2 rounded-full shadow-md">
            <span className="font-bold text-slate-900 mr-2">{overallScore}</span>
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  fill={
                    i < fullStars
                      ? "currentColor"
                      : i === fullStars && hasHalfStar
                        ? "currentColor"
                        : "none"
                  }
                  className={`${i < fullStars || (i === fullStars && hasHalfStar) ? "text-yellow-500" : "text-slate-300"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {/* Analysis summary */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            {summary}
          </h1>
          
          {/* Camera info moved here and only shown when available */}
          {cameraInfo && cameraInfo !== t("results.noExifData") && (
            <div className="flex items-center text-sm text-slate-500 whitespace-nowrap">
              <Camera className="h-4 w-4 mr-2" />
              <span className="overflow-hidden text-ellipsis">{cameraInfo}</span>
            </div>
          )}
        </div>
        
        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoResultCard;