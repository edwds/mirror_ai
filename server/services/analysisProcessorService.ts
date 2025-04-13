// 분석 프로세스 중인 사진 ID를 관리하는 서비스
class AnalysisProcessorService {
  private processingPhotoMap: Map<number, boolean>;

  constructor() {
    this.processingPhotoMap = new Map<number, boolean>();
    console.log("🚀 분석 처리 상태 관리 서비스 초기화");
  }

  // 특정 사진 ID가 처리 중인지 확인
  isProcessing(photoId: number): boolean {
    return this.processingPhotoMap.get(photoId) === true;
  }

  // 처리 시작 표시
  startProcessing(photoId: number): void {
    // 혹시 모를 이전 상태 제거
    this.processingPhotoMap.delete(photoId);
    this.processingPhotoMap.set(photoId, true);
  }

  // 처리 종료 표시
  endProcessing(photoId: number): void {
    this.processingPhotoMap.delete(photoId);
  }

  // 현재 처리 중인 목록 반환 (디버깅용)
  getProcessingList(): number[] {
    return Array.from(this.processingPhotoMap.keys());
  }

  // 서버 시작 시 초기화 (필요시 호출)
  initialize(): void {
    this.processingPhotoMap.clear();
    console.log("🔄 분석 처리 상태 맵 초기화 완료");
  }
}

// 싱글톤 인스턴스 생성 및 export
export const analysisProcessor = new AnalysisProcessorService();