/**
 * HTML to Image utility functions
 * This utility provides functions to convert HTML elements to images
 * Using a more secure approach that doesn't rely on SVG foreignObject
 */

/**
 * Converts an HTML element to a data URL
 * This version uses a safer method that works in Replit's security context
 * Also handles photo image by using the image proxy server
 * @param element The HTML element to convert
 * @param photoUrl The URL of the photo to include in the image
 * @param analysisData Optional analysis data to include in the image
 * @returns A Promise that resolves with the data URL
 */
export const elementToDataURL = (
  element: HTMLElement,
  photoUrl?: string,
  analysisData?: {
    title?: string;
    tags?: string[];
    score?: number;
    strengths?: string[];
    improvements?: string[];
    cameraInfo?: string;
  },
): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      // 카드 치수 설정 (콘텐츠에 따라 동적으로 조정)
      const width = 1080; // 기본 너비 (px)

      // 텍스트 콘텐츠 길이에 따라 동적으로 컨텐츠 영역 높이 계산 (너비 기준 상대값 사용)
      // 모바일용으로 콘텐츠 영역 높이 크게 확장
      const minContentHeight = Math.round(width * 0.45); // 최소 컨텐츠 영역 높이 (너비의 45%로 확대)
      let contentHeight = minContentHeight;

      // 강점과 개선점 텍스트의 길이에 따라 추가 높이 계산
      const strengthsText = analysisData?.strengths?.join(" ") || "";
      const improvementsText = analysisData?.improvements?.join(" ") || "";

      // 각 항목의 평균 길이보다 길면 추가 공간 확보 (너비 기준 상대값 사용)
      const avgTextLength = Math.round(width * 0.07); // 평균 텍스트 길이 (너비의 7%)
      const strengthsLines = Math.ceil(strengthsText.length / avgTextLength);
      const improvementsLines = Math.ceil(
        improvementsText.length / avgTextLength,
      );

      // 2줄 이상인 경우 추가 높이 부여 (너비 기준 상대값 사용)
      const lineHeight = Math.round(width * 0.028); // 줄 높이 (너비의 2.8%)
      if (strengthsLines > 2) {
        contentHeight += (strengthsLines - 2) * lineHeight;
      }
      if (improvementsLines > 2) {
        contentHeight += (improvementsLines - 2) * lineHeight;
      }

      // 최대 높이 제한 (너무 길어지지 않도록, 너비 기준 상대값 사용)
      contentHeight = Math.min(contentHeight, Math.round(width * 0.35)); // 최대 높이 (너비의 35%)

      // 카메라 영역 관련 설정 변수들 (이미지 최하단 영역)
      const cameraAreaHeight = Math.round(width * 0.15); // 카메라 영역 높이
      const cameraAreaMargin = Math.round(width * 0.08); // 카메라 영역 위 여백
      const cameraAreaTotal = cameraAreaHeight + cameraAreaMargin; // 카메라 영역 총 높이

      const imageHeight = 1080; // 정사각형 이미지 영역
      const height = imageHeight + contentHeight + cameraAreaTotal; // 이미지 + 동적 컨텐츠 영역 + 카메라 영역
      const padding = Math.round(width * 0.05); // 전체 패딩 (5% of width)
      const borderRadius = Math.round(width * 0.035); // 전체 이미지 라운딩 (3.5%)

      // 캔버스 생성 (그림자 공간 확보를 위해 크기를 약간 키움)
      const shadowSize = 30; // 그림자 영역 (약간 줄임)
      const canvas = document.createElement("canvas");
      canvas.width = width + shadowSize * 2;
      canvas.height = height + shadowSize * 2;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("캔버스 컨텍스트를 가져올 수 없습니다"));
        return;
      }

      // 투명 배경 (그림자 표현을 위해)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 그림자 그리기 (참조 이미지 스타일과 일치하도록 조정)
      ctx.shadowColor = "rgba(0, 0, 0, 0.2)"; // 20% 투명도
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 8; // 조금 더 약하게

      // 라운딩된 사각형 경로 생성 (그림자용)
      ctx.beginPath();
      ctx.roundRect(shadowSize, shadowSize, width, height, borderRadius);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // 그림자 효과 제거 후 실제 카드 그리기
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // 배경 (흰색) - 라운딩된 사각형
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(shadowSize, shadowSize, width, height, borderRadius);
      ctx.fill();

      // 1. 이미지 영역 (정사각형, 상단에 위치)
      if (photoUrl) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous"; // CORS 정책 처리

          // 이미지 로드 프로미스
          await new Promise<void>((resolveImg, rejectImg) => {
            img.onload = () => {
              // 이미지를 정사각형으로 중앙 크롭하여 그리기
              const imgAspect = img.width / img.height;
              let sx = 0,
                sy = 0,
                sWidth = img.width,
                sHeight = img.height;

              // 이미지 비율에 따라 중앙 크롭
              if (imgAspect > 1) {
                // 가로가 더 긴 경우
                sWidth = img.height;
                sx = (img.width - sWidth) / 2;
              } else if (imgAspect < 1) {
                // 세로가 더 긴 경우
                sHeight = img.width;
                sy = (img.height - sHeight) / 2;
              }

              // 이미지의 상단 모서리에만 라운딩을 적용하기 위한 클리핑 경로 생성
              ctx.save();

              // 라운딩된 상단 모서리 클리핑 경로
              ctx.beginPath();
              ctx.moveTo(shadowSize, shadowSize + borderRadius);
              ctx.arcTo(
                shadowSize,
                shadowSize,
                shadowSize + borderRadius,
                shadowSize,
                borderRadius,
              ); // 좌측 상단
              ctx.lineTo(shadowSize + width - borderRadius, shadowSize);
              ctx.arcTo(
                shadowSize + width,
                shadowSize,
                shadowSize + width,
                shadowSize + borderRadius,
                borderRadius,
              ); // 우측 상단
              ctx.lineTo(shadowSize + width, shadowSize + imageHeight);
              ctx.lineTo(shadowSize, shadowSize + imageHeight);
              ctx.closePath();
              ctx.clip();

              // 정사각형 이미지 영역에 그리기
              ctx.drawImage(
                img,
                sx,
                sy,
                sWidth,
                sHeight,
                shadowSize,
                shadowSize,
                width,
                imageHeight,
              );

              ctx.restore();

              // 3. 이미지 하단 그라데이션 오버레이
              const gradientHeight = imageHeight * 0.25; // 이미지 높이의 25%
              const gradientY = shadowSize + imageHeight - gradientHeight;

              const gradient = ctx.createLinearGradient(
                shadowSize,
                gradientY,
                shadowSize,
                shadowSize + imageHeight,
              );
              gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
              gradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");

              ctx.fillStyle = gradient;
              ctx.fillRect(shadowSize, gradientY, width, gradientHeight);

              resolveImg();
            };

            img.onerror = () => {
              console.warn(
                "이미지를 로드할 수 없습니다. 그라데이션으로 대체합니다.",
              );
              // 이미지 로드 실패 시 그라데이션으로 대체
              const gradient = ctx.createLinearGradient(
                0,
                0,
                width,
                imageHeight,
              );
              gradient.addColorStop(0, "#3b82f6"); // 파란색 시작
              gradient.addColorStop(1, "#1e3a8a"); // 진한 파란색으로 끝
              ctx.fillStyle = gradient;
              ctx.fillRect(0, 0, width, imageHeight);

              // 그라데이션 오버레이 추가
              const overlayGradient = ctx.createLinearGradient(
                0,
                imageHeight - 270,
                0,
                imageHeight,
              );
              overlayGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
              overlayGradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");
              ctx.fillStyle = overlayGradient;
              ctx.fillRect(0, imageHeight - 270, width, 270);

              resolveImg();
            };

            // 이미지 프록시를 사용하여 외부 이미지를 안전하게 가져오기
            if (photoUrl.startsWith("http")) {
              const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(photoUrl)}`;
              img.src = proxyUrl;
            } else {
              img.src = photoUrl;
            }
          });
        } catch (imgError) {
          console.error("이미지 처리 중 오류:", imgError);
          // 오류 발생 시 그라데이션으로 대체
          const gradient = ctx.createLinearGradient(0, 0, width, imageHeight);
          gradient.addColorStop(0, "#3b82f6");
          gradient.addColorStop(1, "#1e3a8a");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, imageHeight);

          // 그라데이션 오버레이 추가
          const overlayGradient = ctx.createLinearGradient(
            0,
            imageHeight - 270,
            0,
            imageHeight,
          );
          overlayGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
          overlayGradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");
          ctx.fillStyle = overlayGradient;
          ctx.fillRect(0, imageHeight - 270, width, 270);
        }
      } else {
        // 이미지 URL이 없으면 그라데이션으로 대체 (라운딩된 모서리 적용)
        ctx.save();

        // 라운딩된 상단 모서리 클리핑 경로
        ctx.beginPath();
        ctx.moveTo(shadowSize, shadowSize + borderRadius);
        ctx.arcTo(
          shadowSize,
          shadowSize,
          shadowSize + borderRadius,
          shadowSize,
          borderRadius,
        ); // 좌측 상단
        ctx.lineTo(shadowSize + width - borderRadius, shadowSize);
        ctx.arcTo(
          shadowSize + width,
          shadowSize,
          shadowSize + width,
          shadowSize + borderRadius,
          borderRadius,
        ); // 우측 상단
        ctx.lineTo(shadowSize + width, shadowSize + imageHeight);
        ctx.lineTo(shadowSize, shadowSize + imageHeight);
        ctx.closePath();
        ctx.clip();

        // 그라데이션 배경
        const gradient = ctx.createLinearGradient(
          shadowSize,
          shadowSize,
          shadowSize + width,
          shadowSize + imageHeight,
        );
        gradient.addColorStop(0, "#3b82f6");
        gradient.addColorStop(1, "#1e3a8a");
        ctx.fillStyle = gradient;
        ctx.fillRect(shadowSize, shadowSize, width, imageHeight);

        // 그라데이션 오버레이 추가
        const overlayGradient = ctx.createLinearGradient(
          shadowSize,
          shadowSize + imageHeight - 270,
          shadowSize,
          shadowSize + imageHeight,
        );
        overlayGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        overlayGradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");
        ctx.fillStyle = overlayGradient;
        ctx.fillRect(shadowSize, shadowSize + imageHeight - 270, width, 270);

        ctx.restore();
      }

      // 2. 점수 박스 (이미지 우상단) - 참조 이미지와 일치하도록 둥근 사각형으로 변경
      const score = analysisData?.score || getScoreFromElement(element);
      if (score > 0) {
        // 점수 위치 및 크기 - 고정된 위치와 크기 (우측 상단에 배치, 새로운 이미지 기준)
        const scoreBoxWidth = Math.round(width * 0.18); // 너비의 18%로 설정 (더 작게)
        const scoreBoxHeight = Math.round(width * 0.12); // 너비의 12%로 설정 (더 작게)
        // 첨부된 이미지처럼 우측 상단에 고정 위치
        const scoreBoxX =
          shadowSize + width - scoreBoxWidth - Math.round(width * 0.05); // 우측에서 5% 여백
        const scoreBoxY = shadowSize + Math.round(width * 0.08); // 상단에서 8% 여백 (더 아래로)
        const scoreBoxRadius = Math.round(width * 0.04); // 너비의 4% 라운딩

        // 점수 배경 (흰색 둥근 사각형)
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)"; // 약간 투명하게 (95%)
        ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        ctx.beginPath();
        ctx.roundRect(
          scoreBoxX,
          scoreBoxY,
          scoreBoxWidth,
          scoreBoxHeight,
          scoreBoxRadius,
        );
        ctx.fill();
        ctx.shadowColor = "transparent";

        // 점수 텍스트 (적절한 크기로 - 별점 없이 숫자만 표시)
        const scoreFontSize = Math.round(scoreBoxHeight * 0.5); // 박스 높이의 50%로 조정 (너무 크지 않게)
        ctx.font = `bold ${scoreFontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = "#1e293b";
        ctx.textAlign = "center";
        const scoreTextX = scoreBoxX + scoreBoxWidth / 2;
        const scoreTextY = scoreBoxY + scoreBoxHeight / 2 + scoreFontSize / 3; // 완벽한 세로 중앙 정렬
        ctx.fillText(score.toString(), scoreTextX, scoreTextY);
      }

      // 3. 이미지 하단 그라데이션 오버레이 (더 넓고 강하게)
      const gradientHeight = imageHeight * 0.35; // 이미지 높이의 35%로 확대
      const gradientY = shadowSize + imageHeight - gradientHeight;

      const gradient = ctx.createLinearGradient(
        shadowSize,
        gradientY,
        shadowSize,
        shadowSize + imageHeight,
      );
      gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(0.6, "rgba(0, 0, 0, 0.5)"); // 중간 지점에 50% 블랙 추가
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.8)"); // 더 진하게 (80%)

      ctx.fillStyle = gradient;
      ctx.fillRect(shadowSize, gradientY, width, gradientHeight);

      // 4. 제목 및 태그 (이미지 영역 안쪽에 위치)
      const title = analysisData?.title || getTitleFromElement(element);
      const titleFontSize = Math.round(width * 0.065); // 50% 더 크게 (너비의 8%)

      // 제목 위치 - 이미지 영역 안쪽 하단 (더 위로 이동)
      const titleY = shadowSize + imageHeight - Math.round(width * 0.16); // 이미지 하단에서 더 위로 이동

      // 제목 그리기 (최대 2줄까지)
      ctx.font = `bold ${titleFontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";

      // 텍스트 줄바꿈 처리를 위한 최대 너비 계산
      const titleMaxWidth = width - padding * 2;

      // 제목 줄바꿈 처리
      const titleLines = wrapText(ctx, title, titleMaxWidth);

      // 최대 2줄까지만 표시하고, 2줄을 넘으면 말줄임표 추가
      const titleMaxLines = Math.min(titleLines.length, 2);
      const titleLineGap = titleFontSize * 1.2; // 줄 간격

      // 하단 정렬을 위해 시작 Y 위치 계산 (줄 수에 따라 위로 올라감)
      const titleStartY = titleY - (titleMaxLines - 1) * titleLineGap;

      // 각 줄 그리기
      for (let i = 0; i < titleMaxLines; i++) {
        let lineText = titleLines[i];
        // 마지막 줄이고 더 많은 줄이 있으면 말줄임표 추가
        if (i === titleMaxLines - 1 && titleLines.length > titleMaxLines) {
          // 마지막 줄이 너무 길면 잘라내고 말줄임표 추가
          if (lineText.length > 30) {
            lineText = lineText.substring(0, 27) + "...";
          } else {
            lineText += "...";
          }
        }
        ctx.fillText(
          lineText,
          shadowSize + padding,
          titleStartY + i * titleLineGap,
        );
      }

      // 태그 그리기 (참조 이미지와 정확히 일치하는 스타일로)
      const tags = analysisData?.tags || getTagsFromElement(element);
      if (tags && tags.length > 0) {
        const tagFontSize = Math.round(width * 0.03); // 너비의 2.8%로 약간 키움
        const tagHeight = tagFontSize * 1.6; // 높이 (약간 더 높게)
        const tagRadius = tagHeight / 2; // 완전 둥근 모서리
        const tagPadding = Math.round(width * 0.03); // 태그 내부 패딩 증가 (너비의 1.8%)

        let tagX = shadowSize + padding;
        // 태그 위치를 더 위로 올리기 (타이틀 위치 아래에서 적절한 간격 유지)
        const tagOffsetFromTitle = Math.round(width * 0.08); // 타이틀과의 간격 (너비의 8%)
        const tagY = titleY + tagOffsetFromTitle;
        const tagGap = Math.round(width * 0.025); // 태그 간격 (너비의 2%)

        // 태그 렌더링 (최대 3개)
        const displayTags = tags.slice(0, 3);

        // 먼저 각 태그의 너비 계산
        const tagWidths = displayTags.map((tag) => {
          ctx.font = `${tagFontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
          const tagText = `#${tag}`;
          return {
            tag: tagText,
            width: ctx.measureText(tagText).width + tagPadding * 2,
          };
        });

        // 이미지 영역 내에 들어오는 태그 계산 (모든 태그를 표시하는데 마지막 태그만 필요한 경우 말줄임 처리)
        let currentTagX = tagX;
        const processedTags = [];
        
        // 먼저 모든 태그의 전체 너비를 확인해서 이미지 영역에 맞는지 확인
        const totalTagWidth = tagWidths.reduce((sum, { width }) => sum + width, 0) + 
                            (tagWidths.length - 1) * tagGap;
        const availableWidth = shadowSize + width - padding * 2;
        
        // 모든 태그가 이미지 영역에 들어갈 수 있는 경우
        if (totalTagWidth <= availableWidth) {
          // 모든 태그를 그대로 표시
          tagWidths.forEach(({ tag, width }) => {
            processedTags.push({ tag, width, x: currentTagX });
            currentTagX += width + tagGap;
          });
        } else {
          // 모든 태그가 이미지 영역에 들어갈 수 없는 경우
          // 마지막 태그를 제외한 태그들을 먼저 처리
          for (let i = 0; i < tagWidths.length - 1; i++) {
            const { tag, width } = tagWidths[i];
            // 현재 태그 이후 최소한 다음 태그를 위한 공간이 필요
            const minNextTagWidth = tagPadding * 2 + ctx.measureText('...').width;
            const remainingWidth = shadowSize + width - padding - currentTagX;
            
            // 현재 태그가 들어갈 공간이 충분한지 확인
            if (remainingWidth >= width && 
                availableWidth - (currentTagX - tagX + width + tagGap) >= minNextTagWidth) {
              // 전체 태그가 들어갈 수 있음
              processedTags.push({ tag, width, x: currentTagX });
              currentTagX += width + tagGap;
            } else {
              // 남은 공간이 부족하면 현재 태그는 생략하고 다음으로 넘어감
              break;
            }
          }
          
          // 마지막으로 남은 공간에 마지막 태그 처리
          if (processedTags.length < tagWidths.length) {
            const lastTag = tagWidths[tagWidths.length - 1].tag;
            const remainingWidth = shadowSize + width - padding - currentTagX;
            
            if (remainingWidth >= tagWidths[tagWidths.length - 1].width) {
              // 마지막 태그 전체가 들어갈 수 있음
              processedTags.push({ 
                tag: lastTag, 
                width: tagWidths[tagWidths.length - 1].width, 
                x: currentTagX 
              });
            } else if (remainingWidth > tagPadding * 2 + ctx.measureText('...').width) {
              // 말줄임으로 처리 가능
              const ellipsisWidth = ctx.measureText('...').width;
              let shortenedTag = lastTag;
              
              // 태그를 점진적으로 줄여가며 말줄임 추가
              while (ctx.measureText(shortenedTag).width + ellipsisWidth + tagPadding * 2 > remainingWidth && 
                     shortenedTag.length > 1) {
                shortenedTag = shortenedTag.slice(0, -1);
              }
              
              const shortenedWidth = ctx.measureText(shortenedTag + '...').width + tagPadding * 2;
              processedTags.push({ 
                tag: shortenedTag + '...', 
                width: shortenedWidth, 
                x: currentTagX 
              });
            }
          }
        }
        
        // 실제 태그 렌더링 (말줄임 처리된 태그 포함)
        processedTags.forEach(({ tag, width, x }) => {
          // 태그 배경 (반투명 회색, 참조 이미지와 일치하도록 색상 조정)
          ctx.fillStyle = "rgba(90, 90, 90, 0.65)"; // 더 진하고 불투명하게
          ctx.beginPath();
          ctx.roundRect(
            x, // 미리 계산된 x 위치 사용 (새로운 코드에서는 위치 미리 계산)
            tagY - tagHeight + tagFontSize / 2,
            width,
            tagHeight,
            tagRadius,
          );
          ctx.fill();

          // 태그 텍스트
          ctx.font = `${tagFontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "left";
          ctx.fillText(tag, x + tagPadding, tagY); // 미리 계산된 x 위치 사용
        });
      }

      // 5 & 6. 강점 및 개선점 (이미지 아래 영역) - 각각 1개씩만 표시 (디자인 개선)
      const strengths =
        analysisData?.strengths || getStrengthsFromElement(element);
      const improvements =
        analysisData?.improvements || getImprovementsFromElement(element);

      // 시작 Y 위치 (이미지 바로 아래)
      // 컨텐츠 영역 시작 위치에 일관된 여백 적용 (너비의 6%)
      const contentStartMargin = Math.round(width * 0.08);
      let currentY = imageHeight + contentStartMargin;

      // 강점 렌더링 (최대 1개만)
      if (strengths && strengths.length > 0) {
        // 첫번째 강점만 렌더링
        const strength = strengths[0];

        // 아이콘 관련 크기 설정 (모바일용으로 크게)
        const strengthIconStarSize = Math.round(width * 0.03); // 30% 더 큰 별 아이콘
        const strengthIconBgSize = Math.round(width * 0.065); // 45% 더 큰 배경
        const strengthIconX = shadowSize + padding + strengthIconBgSize / 2;
        const strengthIconY = shadowSize + currentY + strengthIconBgSize / 2;

        // 녹색 원형 배경 (민트색)
        ctx.fillStyle = "#dcfce7";
        ctx.beginPath();
        ctx.arc(
          strengthIconX,
          strengthIconY,
          strengthIconBgSize / 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        // 별 아이콘 (녹색) - 참조 이미지에 맞게 스타일 조정
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 1.5;
        ctx.fillStyle = "transparent";
        drawStarOutline(
          ctx,
          strengthIconX,
          strengthIconY,
          strengthIconStarSize * 0.6,
        );

        // 텍스트 관련 설정 (모바일용으로 크게)
        const strengthTextSize = Math.round(width * 0.04); // 너비의 4%로 더 키움
        const strengthTextPadding = Math.round(width * 0.055); // 패딩도 더 넓게
        const strengthTextX =
          shadowSize + padding + strengthIconBgSize + strengthTextPadding;
        const strengthTextY = shadowSize + currentY + strengthIconBgSize / 2;

        // 텍스트 스타일
        ctx.font = `${strengthTextSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = "#334155";
        ctx.textAlign = "left";

        // 텍스트 줄바꿈 처리
        const strengthMaxWidth =
          width -
          padding * 2 -
          strengthIconBgSize -
          strengthTextPadding -
          Math.round(width * 0.02);
        const strengthLines = wrapText(ctx, strength, strengthMaxWidth);

        // 최대 2줄까지만 표시 (요청대로 변경)
        const strengthMaxLines = Math.min(strengthLines.length, 2);
        const strengthLineGap = strengthTextSize * 1.4;

        // 아이콘 중심 기준으로 텍스트 세로 중앙 정렬 (요청대로 변경)
        // 1줄이면 아이콘 중심에 맞춤, 2줄이면 첫 줄이 아이콘 중심보다 위에 오도록 조정
        let strengthFirstLineY;
        if (strengthMaxLines === 1) {
          // 1줄이면 아이콘 중심에 맞춤
          strengthFirstLineY = strengthTextY + strengthTextSize * 0.35; // 텍스트 높이의 약 1/3 지점이 기준선
        } else {
          // 2줄이면 첫 줄이 아이콘 중심보다 위에 오도록 조정
          strengthFirstLineY =
            strengthTextY - strengthLineGap / 2 + strengthTextSize * 0.35;
        }

        for (let i = 0; i < strengthMaxLines; i++) {
          // 2줄 이상이고 마지막 줄이면 말줄임표 추가
          let lineText = strengthLines[i];
          if (
            i === strengthMaxLines - 1 &&
            strengthLines.length > strengthMaxLines
          ) {
            if (lineText.length > 30) {
              lineText = lineText.substring(0, 27) + "...";
            } else {
              lineText += "...";
            }
          }
          ctx.fillText(
            lineText,
            strengthTextX,
            strengthFirstLineY + i * strengthLineGap,
          );
        }

        // 다음 아이템 위치로 이동
        const strengthTotalHeight = strengthLineGap * (strengthMaxLines - 1);
        const strengthSectionHeight = Math.max(
          strengthIconBgSize,
          strengthTotalHeight,
        );

        // 시작 여백과 동일한 여백을 사용하여 일관성 유지
        const sectionMargin = contentStartMargin;

        // 텍스트 길이에 따라 전체 강점 섹션 높이 계산
        const strengthSectionTotalHeight =
          strengthSectionHeight + sectionMargin;

        // 다음 섹션을 위한 Y 위치 업데이트
        currentY += strengthSectionTotalHeight;
      }

      // 개선점 렌더링 (최대 1개만)
      if (improvements && improvements.length > 0) {
        // 첫번째 개선점만 렌더링
        const improvement = improvements[0];

        // 아이콘 관련 크기 설정 (모바일용으로 크게)
        const improvIconStarSize = Math.round(width * 0.03); // 30% 더 큰 별 아이콘
        const improvIconBgSize = Math.round(width * 0.065); // 45% 더 큰 배경
        const improvIconX = shadowSize + padding + improvIconBgSize / 2;
        const improvIconY = shadowSize + currentY + improvIconBgSize / 2;

        // 파란색 원형 배경
        ctx.fillStyle = "#dbeafe";
        ctx.beginPath();
        ctx.arc(improvIconX, improvIconY, improvIconBgSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // 스파클 아이콘 (파란색) - 참조 이미지와 일치하도록 수정
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1.5;
        drawSparkle(ctx, improvIconX, improvIconY, improvIconStarSize * 0.7);

        // 텍스트 관련 설정 (모바일용으로 크게)
        const improvTextSize = Math.round(width * 0.04); // 너비의 4%로 더 키움
        const improvTextPadding = Math.round(width * 0.055); // 패딩도 더 넓게
        const improvTextX =
          shadowSize + padding + improvIconBgSize + improvTextPadding;
        const improvTextY = shadowSize + currentY + improvIconBgSize / 2;

        // 텍스트 스타일
        ctx.font = `${improvTextSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = "#334155";
        ctx.textAlign = "left";

        // 텍스트 줄바꿈 처리
        const improvMaxWidth =
          width -
          padding * 2 -
          improvIconBgSize -
          improvTextPadding -
          Math.round(width * 0.02);
        const improvLines = wrapText(ctx, improvement, improvMaxWidth);

        // 최대 2줄까지만 표시 (요청대로 변경)
        const improvMaxLines = Math.min(improvLines.length, 2);
        const improvLineGap = improvTextSize * 1.4;

        // 아이콘 중심 기준으로 텍스트 세로 중앙 정렬 (요청대로 변경)
        // 1줄이면 아이콘 중심에 맞춤, 2줄이면 첫 줄이 아이콘 중심보다 위에 오도록 조정
        let improvFirstLineY;
        if (improvMaxLines === 1) {
          // 1줄이면 아이콘 중심에 맞춤
          improvFirstLineY = improvTextY + improvTextSize * 0.35; // 텍스트 높이의 약 1/3 지점이 기준선
        } else {
          // 2줄이면 첫 줄이 아이콘 중심보다 위에 오도록 조정
          improvFirstLineY =
            improvTextY - improvLineGap / 2 + improvTextSize * 0.35;
        }

        for (let i = 0; i < improvMaxLines; i++) {
          // 2줄 이상이고 마지막 줄이면 말줄임표 추가
          let lineText = improvLines[i];
          if (i === improvMaxLines - 1 && improvLines.length > improvMaxLines) {
            if (lineText.length > 30) {
              lineText = lineText.substring(0, 27) + "...";
            } else {
              lineText += "...";
            }
          }
          ctx.fillText(
            lineText,
            improvTextX,
            improvFirstLineY + i * improvLineGap,
          );
        }

        // 다음 아이템 위치로 이동
        const improvTotalHeight = improvLineGap * (improvMaxLines - 1);
        const improvSectionHeight = Math.max(
          improvIconBgSize,
          improvTotalHeight,
        );

        // 강점 섹션과 동일한 여백 사용
        const sectionMargin = contentStartMargin;

        // 텍스트 길이에 따라 전체 개선점 섹션 높이 계산
        const improvSectionTotalHeight = improvSectionHeight + sectionMargin;

        // 다음 섹션을 위한 Y 위치 업데이트
        currentY += improvSectionTotalHeight;
      }

      // 7. 카메라 정보 (하단) - 항상 표시되도록 수정
      let cameraInfo =
        analysisData?.cameraInfo || getCameraInfoFromElement(element);

      // 카메라 정보가 없을 경우 "Unknown Camera" 표시
      if (!cameraInfo || cameraInfo === "") {
        cameraInfo = "Unknown Camera";
      }

      // 개선점/강점 영역과 카메라 정보 영역 사이에 여백 최소화하여 항상 표시되도록 함
      // 이미지가 수직길이 초과되면 강점/개선점을 하나씩으로 제한하는 로직과 함께 여백도 줄임
      const afterContentMargin = Math.round(width * 0.02); // 여백을 더 줄임 (너비의 5%)

      // 구분선 그리기 (강점/개선점 영역 다음에 여백을 두고 배치)
      const separatorY = shadowSize + currentY + afterContentMargin;
      ctx.strokeStyle = "#cbd5e1"; // 더 진한 구분선 색상
      ctx.lineWidth = 1; // 두께 증가
      ctx.beginPath();
      ctx.moveTo(shadowSize + padding, separatorY);
      ctx.lineTo(shadowSize + width - padding, separatorY);
      ctx.stroke();

      // 카메라 정보 영역 (구분선 아래에 배치) - 위에서 정의한 cameraAreaHeight 사용
      // 장점/개선점과 동일한 간격 적용 (사용자 요청)
      const cameraY = separatorY + Math.round(width * 0.01); // 구분선 아래로 약간 더 이동 (장점/개선점 간격과 동일하게)

      // 카메라 영역 배경 제거 (사용자 요청에 따라)

      // 카메라 아이콘 (모바일용으로 적절한 크기로)
      const cameraIconSize = Math.round(width * 0.05); // 너비의 5%로 조정 (약간 더 크게)
      const cameraIconX = shadowSize + padding + cameraIconSize / 2;
      const cameraIconY = cameraY + cameraAreaHeight / 2; // 세로 중앙 정렬

      // 아이콘 그리기 (참조 이미지와 일치하는 색상, 장점/개선점 아이콘과 동일한 색상으로)
      ctx.fillStyle = "#64748b"; // 슬레이트 그레이 (장점/개선점 아이콘과 동일한 색상)
      drawCamera(ctx, cameraIconX, cameraIconY, cameraIconSize / 2);

      // 카메라 정보 그대로 사용 (구분자 제거)
      // 특별한 포맷팅 없이 그대로 표시

      // 카메라 정보 텍스트 (모바일용으로 적절한 크기, 세로 중앙 정렬)
      const cameraTextSize = Math.round(width * 0.04); // 너비의 4.2%
      ctx.font = `${cameraTextSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`; // 레귤러 폰트
      ctx.fillStyle = "#64748b"; // 옅은 회색 (요청대로 색상 수정)
      ctx.textAlign = "left";

      // 텍스트가 잘리지 않도록 최대 너비 제한 및 텍스트 자르기 (장점/개선점과 동일한 간격)
      const maxCameraTextWidth =
        width - padding * 2 - cameraIconSize - Math.round(width * 0.1);
      // 장점/개선점과 동일한 간격으로 텍스트 시작 위치 조정
      const cameraTextX =
        shadowSize + padding + cameraIconSize + Math.round(width * 0.05);

      // 텍스트 너비 측정
      const measuredWidth = ctx.measureText(cameraInfo).width;

      // 텍스트가 너무 길면 자름
      if (measuredWidth > maxCameraTextWidth) {
        // 텍스트를 최대 너비에 맞게 자름
        let shortenedText = cameraInfo;
        while (
          ctx.measureText(shortenedText + "...").width > maxCameraTextWidth &&
          shortenedText.length > 0
        ) {
          shortenedText = shortenedText.slice(0, -1);
        }
        cameraInfo = shortenedText + "...";
      }

      // 텍스트를 세로 중앙에 배치
      const cameraTextY = cameraY + cameraAreaHeight / 2 + cameraTextSize / 3; // 세로 중앙 정렬
      ctx.fillText(cameraInfo, cameraTextX, cameraTextY);

      // 워터마크 제거 (요청에 따라)

      // 데이터 URL로 변환
      try {
        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      } catch (error) {
        console.error("데이터 URL 생성 중 오류:", error);
        reject(error);
      }
    } catch (error) {
      console.error("이미지 생성 중 오류:", error);
      reject(error);
    }
  });
};

// 별점 계산 함수
function calculateStarRating(score: number): {
  fullStars: number;
  hasHalfStar: boolean;
} {
  let starRating = 0;

  if (score >= 95) starRating = 5.0;
  else if (score >= 90) starRating = 4.5;
  else if (score >= 85) starRating = 4.0;
  else if (score >= 80) starRating = 4.0;
  else if (score >= 75) starRating = 3.5;
  else if (score >= 70) starRating = 3.5;
  else if (score >= 65) starRating = 3.0;
  else if (score >= 60) starRating = 3.0;
  else if (score >= 55) starRating = 2.5;
  else if (score >= 50) starRating = 2.5;
  else if (score >= 45) starRating = 2.0;
  else if (score >= 40) starRating = 2.0;
  else if (score >= 35) starRating = 1.5;
  else if (score >= 30) starRating = 1.5;
  else if (score >= 20) starRating = 1.0;
  else if (score >= 10) starRating = 1.0;
  else starRating = 0.5;

  return {
    fullStars: Math.floor(starRating),
    hasHalfStar: starRating % 1 !== 0,
  };
}

// 별 그리기 함수 (채워진 별)
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  const spikes = 5;
  const outerRadius = size;
  const innerRadius = size / 2;

  ctx.beginPath();
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;

  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }

  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

// 별 윤곽선 그리기 함수 (참조 이미지에 맞게 추가)
function drawStarOutline(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  const spikes = 5;
  const outerRadius = size;
  const innerRadius = size / 2;

  ctx.beginPath();
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;

  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }

  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.stroke(); // 채우기 대신 윤곽선만 그림
}

// 반 별 그리기 함수
function drawHalfStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  const spikes = 5;
  const outerRadius = size;
  const innerRadius = size / 2;

  // 별의 왼쪽 반만 그림
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - outerRadius, cy - outerRadius, outerRadius, outerRadius * 2);
  ctx.clip();

  drawStar(ctx, cx, cy, size);

  ctx.restore();
}

// 스파클 아이콘 그리기 (간소화된 버전 - 기존)
function drawSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  const length = size * 0.8;

  // 수직 선
  ctx.beginPath();
  ctx.moveTo(cx, cy - length);
  ctx.lineTo(cx, cy + length);
  ctx.lineWidth = 2;
  ctx.stroke();

  // 수평 선
  ctx.beginPath();
  ctx.moveTo(cx - length, cy);
  ctx.lineTo(cx + length, cy);
  ctx.stroke();

  // 대각선 1
  ctx.beginPath();
  ctx.moveTo(cx - length * 0.7, cy - length * 0.7);
  ctx.lineTo(cx + length * 0.7, cy + length * 0.7);
  ctx.stroke();

  // 대각선 2
  ctx.beginPath();
  ctx.moveTo(cx - length * 0.7, cy + length * 0.7);
  ctx.lineTo(cx + length * 0.7, cy - length * 0.7);
  ctx.stroke();
}

// 개선점 아이콘용 스파클 그리기 함수 (참조 이미지 기준 정확히)
function drawSparklesIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  // 스파클에서 중앙 큰 별 (다이아몬드 형태)
  const mainSize = size * 0.8;

  // 메인 다이아몬드 그리기
  ctx.beginPath();
  ctx.moveTo(cx, cy - mainSize); // 상단
  ctx.lineTo(cx + mainSize, cy); // 우측
  ctx.lineTo(cx, cy + mainSize); // 하단
  ctx.lineTo(cx - mainSize, cy); // 좌측
  ctx.closePath();
  ctx.stroke();

  // 작은 보조 스파클 (윗부분)
  const smallSize = size * 0.5;
  ctx.beginPath();
  ctx.moveTo(cx + smallSize * 0.8, cy - mainSize - smallSize); // 상단 우측
  ctx.lineTo(cx + smallSize * 0.8, cy - mainSize - smallSize * 0.5); // 상단 우측 끝
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + smallSize * 0.4, cy - mainSize - smallSize * 0.8); // 작은 대각선
  ctx.lineTo(cx + smallSize * 0.8, cy - mainSize - smallSize * 0.4);
  ctx.stroke();

  // 우측 작은 스파클
  ctx.beginPath();
  ctx.moveTo(cx + mainSize + smallSize * 0.4, cy - smallSize * 0.4); // 우측 위
  ctx.lineTo(cx + mainSize + smallSize * 0.8, cy - smallSize * 0.8); // 우측 위 끝
  ctx.stroke();
}

// 카메라 아이콘 그리기 (참조 이미지 스타일에 맞게 수정)
function drawCamera(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  const width = size * 1.6;
  const height = size * 1.2;

  // 카메라 본체
  ctx.beginPath();
  ctx.roundRect(cx - width / 2, cy - height / 2, width, height, 4);
  ctx.fill();

  // 렌즈
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fill();
}

// 텍스트 줄바꿈 함수
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

// HTML 요소에서 정보 추출 함수들
function getScoreFromElement(element: HTMLElement): number {
  // 점수 추출 시도
  let score = 0;
  element.querySelectorAll("div, span, p").forEach((el) => {
    const text = el.textContent?.trim();
    if (!text) return;

    // 클래스로 점수 식별 시도
    if (el.className?.includes("score") || el.className?.includes("rating")) {
      const possibleScore = parseInt(text, 10);
      if (!isNaN(possibleScore) && possibleScore >= 0 && possibleScore <= 100) {
        score = possibleScore;
        return;
      }
    }

    // 숫자만 있는 텍스트 확인
    if (/^\d{1,3}$/.test(text)) {
      const possibleScore = parseInt(text, 10);
      if (possibleScore >= 0 && possibleScore <= 100) {
        score = possibleScore;
      }
    }
  });

  return score;
}

function getTitleFromElement(element: HTMLElement): string {
  // 제목 추출 시도
  let title = "Photo Analysis";

  // 헤딩 태그 확인
  const headings = element.querySelectorAll("h1, h2, h3");
  if (headings.length > 0) {
    const headingText = headings[0].textContent?.trim();
    if (headingText) {
      title = headingText;
    }
  }

  // 특정 클래스 확인
  const titleElements = element.querySelectorAll(
    ".title, .photo-title, [data-title]",
  );
  if (titleElements.length > 0) {
    const titleText = titleElements[0].textContent?.trim();
    if (titleText) {
      title = titleText;
    }
  }

  return title;
}

function getTagsFromElement(element: HTMLElement): string[] {
  // 태그 추출 시도
  const tags: string[] = [];

  // 태그 관련 요소 찾기
  element.querySelectorAll(".tag, [data-tag], .photo-tag").forEach((el) => {
    const text = el.textContent?.trim();
    if (text) {
      // #이 있으면 제거하고 추가
      tags.push(text.replace(/^#/, ""));
    }
  });

  return tags;
}

function getStrengthsFromElement(element: HTMLElement): string[] {
  // 강점 추출 시도
  const strengths: string[] = [];

  // 강점 관련 요소 찾기
  element
    .querySelectorAll(".strength, [data-strength], .photo-strength")
    .forEach((el) => {
      const text = el.textContent?.trim();
      if (text) {
        strengths.push(text);
      }
    });

  // 분석 영역 확인 (overall 부분)
  const overall = element.querySelector('[data-section="overall"]');
  if (overall) {
    overall.querySelectorAll("li, p").forEach((el) => {
      const text = el.textContent?.trim();
      if (
        text &&
        (el.className?.includes("strength") ||
          el.parentElement?.className?.includes("strength"))
      ) {
        strengths.push(text);
      }
    });
  }

  return strengths;
}

function getImprovementsFromElement(element: HTMLElement): string[] {
  // 개선점 추출 시도
  const improvements: string[] = [];

  // 개선점 관련 요소 찾기
  element
    .querySelectorAll(".improvement, [data-improvement], .photo-improvement")
    .forEach((el) => {
      const text = el.textContent?.trim();
      if (text) {
        improvements.push(text);
      }
    });

  // 분석 영역 확인 (overall 부분)
  const overall = element.querySelector('[data-section="overall"]');
  if (overall) {
    overall.querySelectorAll("li, p").forEach((el) => {
      const text = el.textContent?.trim();
      if (
        text &&
        (el.className?.includes("improvement") ||
          el.parentElement?.className?.includes("improvement"))
      ) {
        improvements.push(text);
      }
    });
  }

  return improvements;
}

function getCameraInfoFromElement(element: HTMLElement): string {
  // 카메라 정보 추출 시도
  let cameraInfo = "";

  // 카메라 관련 요소 찾기
  element
    .querySelectorAll(".camera-info, [data-camera], .exif, .photo-camera")
    .forEach((el) => {
      const text = el.textContent?.trim();
      if (text) {
        // 전체 정보 저장
        cameraInfo = text;
      }
    });

  // 추출 실패 시 원본 텍스트 반환 (또는 없을 경우 빈 문자열)
  return cameraInfo;
}

/**
 * Download an element as PNG
 * @param element HTML Element to convert
 * @param filename Filename to download as
 * @param photoUrl Optional URL of photo to include
 * @param analysisData Optional analysis data to include in the image
 */
export const downloadElementAsPNG = async (
  element: HTMLElement,
  filename: string,
  photoUrl?: string,
  analysisData?: {
    title?: string;
    tags?: string[];
    score?: number;
    strengths?: string[];
    improvements?: string[];
    cameraInfo?: string;
  },
): Promise<void> => {
  try {
    console.log(
      "Converting element to data URL with photo URL:",
      photoUrl ? "yes" : "no",
    );
    const dataUrl = await elementToDataURL(element, photoUrl, analysisData);

    // Create a download link
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log("Image downloaded successfully");
  } catch (error) {
    console.error("Failed to download image:", error);
  }
};

/**
 * Share an element as PNG using the Web Share API (for mobile devices)
 * This allows iOS users to save directly to their Photos app
 * @param element HTML Element to convert
 * @param filename Filename to share as
 * @param photoUrl Optional URL of photo to include
 * @param analysisData Optional analysis data to include in the image
 */
export const shareElementAsPNG = async (
  element: HTMLElement,
  filename: string,
  photoUrl?: string,
  analysisData?: {
    title?: string;
    tags?: string[];
    score?: number;
    strengths?: string[];
    improvements?: string[];
    cameraInfo?: string;
  },
): Promise<void> => {
  try {
    console.log("Converting element to data URL for sharing...");
    const dataUrl = await elementToDataURL(element, photoUrl, analysisData);
    
    // 데이터 URL을 Blob으로 변환
    const fetchResponse = await fetch(dataUrl);
    const blob = await fetchResponse.blob();
    
    // 공유할 수 있는 파일 생성
    const file = new File([blob], filename, { type: 'image/png' });
    
    // 공유 API가 있는지 확인 (주로 모바일 기기에서 지원)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        // 현재 URL을 공유 링크로 사용
        const shareUrl = window.location.href;
        
        // 제목, 점수, 링크 포함한 공유 메시지 생성
        const shareTitle = analysisData?.title ? `Mirror Analysis: ${analysisData.title}` : 'Mirror Analysis';
        const scoreText = analysisData?.score ? `Score: ${analysisData.score}` : '';
        const shareText = `${shareTitle}\n${scoreText}\n${shareUrl}`;
        
        await navigator.share({
          files: [file],
          title: 'Mirror Analysis',
          text: shareText
        });
        console.log('이미지가 성공적으로 공유되었습니다.');
      } catch (error: any) {
        console.error('공유 중 오류 발생:', error);
        // 사용자가 공유를 취소한 경우 등
        if (error?.name !== 'AbortError') {
          // 공유 API는 있지만 다른 오류가 발생한 경우 다운로드로 폴백
          await downloadElementAsPNG(element, filename, photoUrl, analysisData);
        }
      }
    } else {
      // 공유 API를 지원하지 않는 경우 다운로드로 폴백
      console.log("Browser doesn't support sharing files, downloading instead");
      await downloadElementAsPNG(element, filename, photoUrl, analysisData);
    }
  } catch (error: any) {
    console.error("Failed to share image:", error);
    // 일반 오류 발생 시 다운로드로 폴백
    await downloadElementAsPNG(element, filename, photoUrl, analysisData);
  }
};

// 닫는 괄호 추가
