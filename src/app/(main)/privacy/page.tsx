"use client";

import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100%", background: "#FFFFFF" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", padding: "12px 16px",
        borderBottom: "0.5px solid #E0E0E0",
        position: "sticky", top: 0, background: "#FFFFFF", zIndex: 10,
      }}>
        <button onClick={() => router.back()} style={{
          width: 32, height: 32, borderRadius: "50%", border: "none",
          background: "#F4F4F4", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: 600, color: "#1A1A1A", marginRight: 32 }}>개인정보처리방침</div>
      </div>

      <div style={{ padding: "24px 20px 60px", fontSize: 14, color: "#222222", lineHeight: 1.8 }}>
        <p style={{ fontSize: 12, color: "#999999", marginBottom: 24 }}>시행일: 2026년 4월 16일</p>

        <p style={{ fontSize: 13, color: "#4D4D4D", lineHeight: 1.8, marginBottom: 28 }}>
          루트북(이하 &quot;서비스&quot;)은 이용자의 개인정보를 중요하게 생각하며, 「개인정보 보호법」 등 관련 법령을 준수합니다. 이 개인정보처리방침은 서비스가 수집하는 개인정보의 항목, 수집 목적, 보유 기간, 제3자 제공 등에 관한 사항을 안내합니다.
        </p>

        <Section title="제1조 (수집하는 개인정보 항목 및 수집 방법)">
          <p style={{ fontWeight: 600, marginBottom: 4 }}>1. 회원가입 시 수집 항목</p>
          <Table data={[
            ["항목", "필수/선택", "수집 방법"],
            ["Google 계정 정보 (이메일, 이름, 프로필 사진)", "필수", "Google OAuth 로그인"],
            ["닉네임", "필수", "회원가입 후 직접 설정"],
            ["프로필 사진", "선택", "직접 업로드"],
            ["자기소개 (bio)", "선택", "직접 입력"],
            ["Instagram 아이디", "선택", "직접 입력"],
            ["기본 차량", "선택", "직접 입력"],
          ]} />

          <p style={{ fontWeight: 600, marginTop: 16, marginBottom: 4 }}>2. 서비스 이용 과정에서 수집되는 항목</p>
          <Table data={[
            ["항목", "필수/선택", "수집 방법"],
            ["위치 정보 (GPS 좌표)", "선택", "브라우저 위치 권한 허용 시"],
            ["코스 데이터 (경유지 좌표, 경로, 사진, 메모)", "필수 (코스 생성 시)", "직접 입력"],
            ["좋아요/즐겨찾기 내역", "자동", "서비스 이용"],
            ["접속 로그 (IP, 접속 시간)", "자동", "서비스 접속"],
          ]} />
        </Section>

        <Section title="제2조 (개인정보의 수집 및 이용 목적)">
          <Table data={[
            ["목적", "상세"],
            ["회원 관리", "회원 식별, 로그인, 프로필 제공"],
            ["서비스 제공", "코스 생성·저장·공유, 경로 계산, 예상 소요시간 제공"],
            ["위치 기반 서비스", "현재 위치 기반 주변 코스 탐색, 출발지 자동 설정"],
            ["콘텐츠 안전 관리", "업로드 이미지 안전성 검사 (유해 콘텐츠 필터링)"],
            ["서비스 개선", "이용 통계 분석, 오류 진단"],
            ["부정 이용 방지", "금지어 필터링, 부적절한 콘텐츠 관리"],
          ]} />
        </Section>

        <Section title="제3조 (개인정보의 보유 및 파기)">
          <ol style={{ paddingLeft: 20 }}>
            <li>회원의 개인정보는 회원탈퇴 시까지 보유하며, 탈퇴 즉시 파기합니다.</li>
            <li>회원탈퇴 시 다음 정보가 즉시 삭제됩니다:
              <ul style={{ paddingLeft: 20, marginTop: 4 }}>
                <li>프로필 정보 (닉네임, 프로필 사진, 자기소개 등)</li>
                <li>생성한 코스 및 첨부 사진</li>
                <li>좋아요 및 즐겨찾기 내역</li>
              </ul>
            </li>
            <li>다만, 관련 법령에 의해 보존 의무가 있는 정보는 해당 기간 동안 보관합니다:
              <ul style={{ paddingLeft: 20, marginTop: 4 }}>
                <li>접속 기록: 3개월 (통신비밀보호법)</li>
                <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
              </ul>
            </li>
          </ol>
        </Section>

        <Section title="제4조 (개인정보의 제3자 제공)">
          <p style={{ marginBottom: 8 }}>서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 서비스 제공을 위해 다음의 외부 서비스를 이용하며, 이 과정에서 최소한의 정보가 전달될 수 있습니다.</p>
          <Table data={[
            ["제3자", "전달 정보", "목적"],
            ["Google", "OAuth 인증 정보", "회원 로그인"],
            ["Supabase", "회원정보, 코스 데이터, 사진", "데이터 저장 및 인증"],
            ["Mapbox", "지도 요청 좌표, 경로 좌표", "지도 표시 및 경로 계산"],
            ["Kakao", "검색어, 좌표", "장소 검색 및 지오코딩"],
            ["Google Cloud Vision", "업로드 이미지", "이미지 안전성 검사"],
            ["YouTube", "영상 ID", "음악 재생"],
          ]} />
          <p style={{ marginTop: 8, fontSize: 12, color: "#6a6a6a" }}>
            각 서비스 제공자의 개인정보 처리에 대해서는 해당 서비스의 개인정보처리방침이 적용됩니다.
          </p>
        </Section>

        <Section title="제5조 (위치 정보)">
          <ol style={{ paddingLeft: 20 }}>
            <li>서비스는 주변 코스 탐색, 출발지 자동 설정 등을 위해 이용자의 위치 정보를 활용할 수 있습니다.</li>
            <li>위치 정보는 브라우저의 위치 접근 권한을 허용한 경우에만 수집됩니다.</li>
            <li>수집된 위치 정보는 서버에 별도 저장하지 않으며, 실시간 서비스 제공 목적으로만 사용됩니다.</li>
            <li>이용자는 브라우저 설정에서 언제든지 위치 권한을 철회할 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제6조 (쿠키 및 로컬 저장소)">
          <Table data={[
            ["구분", "항목", "목적", "보관 기간"],
            ["쿠키", "인증 세션 토큰", "로그인 상태 유지", "세션 종료 시"],
            ["로컬 저장소", "온보딩 완료 여부", "온보딩 가이드 1회 표시", "영구 (수동 삭제 가능)"],
            ["세션 저장소", "지도 상태", "페이지 복귀 시 위치 복원", "탭 종료 시"],
          ]} />
          <p style={{ marginTop: 8, fontSize: 12, color: "#6a6a6a" }}>
            서비스는 광고 추적 목적의 쿠키를 사용하지 않습니다.
          </p>
        </Section>

        <Section title="제7조 (이용자의 권리)">
          이용자는 다음의 권리를 행사할 수 있습니다.
          <ol style={{ paddingLeft: 20, marginTop: 4 }}>
            <li>개인정보 열람 요청: 서비스 설정 화면에서 본인의 프로필 정보를 확인할 수 있습니다.</li>
            <li>개인정보 수정: 닉네임, 프로필 사진, 자기소개, Instagram 아이디 등을 직접 수정할 수 있습니다.</li>
            <li>개인정보 삭제 (회원탈퇴): 설정 {'>'} 회원탈퇴를 통해 모든 개인정보를 삭제할 수 있습니다.</li>
            <li>위치 정보 수집 거부: 브라우저 설정에서 위치 권한을 거부할 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제8조 (개인정보의 안전성 확보 조치)">
          서비스는 개인정보의 안전성 확보를 위해 다음 조치를 취하고 있습니다.
          <ul style={{ paddingLeft: 20, marginTop: 4 }}>
            <li>모든 통신은 HTTPS를 통해 암호화됩니다.</li>
            <li>인증 토큰은 HTTP-Only 쿠키로 관리됩니다.</li>
            <li>데이터베이스 접근 시 Row Level Security(RLS) 정책을 적용합니다.</li>
            <li>비밀번호는 저장하지 않습니다 (Google OAuth 방식).</li>
            <li>업로드 이미지에 대해 유해 콘텐츠 자동 검사를 수행합니다.</li>
          </ul>
        </Section>

        <Section title="제9조 (만 14세 미만 아동)">
          서비스는 만 14세 미만 아동의 개인정보를 수집하지 않으며, 만 14세 미만임을 인지한 경우 해당 정보를 즉시 삭제합니다.
        </Section>

        <Section title="제10조 (개인정보 처리방침의 변경)">
          <ol style={{ paddingLeft: 20 }}>
            <li>이 방침은 관련 법령 및 서비스 정책 변경에 따라 수정될 수 있습니다.</li>
            <li>변경 시 서비스 내 공지를 통해 안내하며, 변경 사항은 공지 후 7일이 경과한 날부터 효력이 발생합니다.</li>
          </ol>
        </Section>

        <Section title="제11조 (문의)">
          개인정보 처리에 관한 문의사항은 아래로 연락해 주세요.
          <ul style={{ paddingLeft: 20, marginTop: 4 }}>
            <li>서비스명: 루트북 (Routebook)</li>
            <li>이메일: sansu423@gmail.com</li>
          </ul>
        </Section>

        <div style={{ marginTop: 32, padding: "16px 0", borderTop: "1px solid #F4F4F4", fontSize: 12, color: "#999999" }}>
          본 방침은 2026년 4월 16일부터 시행합니다.
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#222222", marginBottom: 8 }}>{title}</h3>
      <div style={{ fontSize: 13, color: "#4D4D4D", lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}

function Table({ data }: { data: string[][] }) {
  const [header, ...rows] = data;
  return (
    <div style={{ overflowX: "auto", marginTop: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={i} style={{
                textAlign: "left", padding: "8px 10px",
                background: "#F8F8F6", fontWeight: 600, color: "#222222",
                borderBottom: "1px solid #E0E0E0", whiteSpace: "nowrap",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: "8px 10px", color: "#4D4D4D",
                  borderBottom: "0.5px solid #F4F4F4",
                  verticalAlign: "top",
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
