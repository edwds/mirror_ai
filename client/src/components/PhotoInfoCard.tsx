import React from 'react';

interface PhotoGenreInfo {
  detectedGenre: string;
  confidence: number;
  isRealPhoto: boolean;
  isFamousArtwork: boolean;
  reasonForClassification: string;
  properties: {
    primaryGenre: string;
    secondaryGenre: string;
    keywords: string[];
    technicalAttributes: any;
  };
}

interface UploadedPhoto {
  id: number;
  displayImagePath: string;
  firebaseDisplayUrl?: string;
  base64DisplayImage?: string;
  photoGenreInfo?: PhotoGenreInfo;
}

interface Props {
  photo: UploadedPhoto;
}

const PhotoInfoCard: React.FC<Props> = ({ photo }) => {
  const imageSrc =
    photo.firebaseDisplayUrl ||
    photo.base64DisplayImage ||
    (photo.displayImagePath?.startsWith('http')
      ? photo.displayImagePath
      : `${window.location.origin}${photo.displayImagePath?.startsWith('/') ? '' : '/'}${photo.displayImagePath}`);

  const genreInfo = photo.photoGenreInfo;

  return (
    <div className="max-w-2xl mx-auto w-full mb-6">
      <div className="relative w-full aspect-square md:aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden shadow-md">
        <img
          src={imageSrc}
          alt="Uploaded Photo"
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=Image+unavailable';
          }}
        />

        {genreInfo && (
          <div className="absolute inset-0 md:static md:relative bg-black/50 md:bg-transparent text-white md:text-inherit p-4 flex flex-col justify-end md:justify-start">
            <div className="text-sm font-medium text-indigo-200 md:text-indigo-600 mb-2 md:mb-1">
              사진 정보
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-300/30 text-white md:bg-indigo-100 md:text-indigo-800">
                  {genreInfo.detectedGenre}
                </span>
                {genreInfo.properties.primaryGenre !== genreInfo.detectedGenre && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-300/30 text-white md:bg-indigo-100 md:text-indigo-700">
                    {genreInfo.properties.primaryGenre}
                  </span>
                )}
                {genreInfo.properties.secondaryGenre && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-300/30 text-white md:bg-purple-100 md:text-purple-800">
                    {genreInfo.properties.secondaryGenre}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {genreInfo.properties.keywords.slice(0, 4).map((keyword, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white/20 text-white md:bg-gray-100 md:text-gray-800"
                  >
                    # {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoInfoCard;
