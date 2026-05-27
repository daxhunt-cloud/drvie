"use client";

import { useRouter } from "next/navigation";

export default function TermsPage() {
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
        <div style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: 600, color: "#1A1A1A", marginRight: 32 }}>서비스 이용약관</div>
      </div>

      <div style={{ padding: "24px 20px 60px", fontSize: 14, color: "#222222", lineHeight: 1.8 }}>
        <p style={{ fontSize: 12, color: "#999999", marginBottom: 24 }}>시행일: 2026년 4월 16일</p>

        <Section title="제1조 (목적)">
          이 약관은 루트북(이하 &quot;서비스&quot;)이 제공하는 드라이브 코스 공유 서비스의 이용과 관련하여, 서비스와 이용자 간의 권리, 의무, 책임사항 및 기타 필요한 사항을 규정함을 목적으로 합니다.
        </Section>

        <Section title="제2조 (정의)">
          <ol style={{ paddingLeft: 20 }}>
            <li>&quot;서비스&quot;란 루트북이 제공하는 웹 애플리케이션 및 이에 부수하는 모든 서비스를 의미합니다.</li>
            <li>&quot;이용자&quot;란 서비스에 접속하여 이 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
            <li>&quot;회원&quot;이란 서비스에 Google 계정으로 로그인하여 이용계약을 체결한 자를 말합니다.</li>
            <li>&quot;코스&quot;란 회원이 생성한 드라이브 경로, 경유지 정보, 사진, 메모, 음악 정보 등을 포함한 콘텐츠를 의미합니다.</li>
          </ol>
        </Section>

        <Section title="제3조 (약관의 효력 및 변경)">
          <ol style={{ paddingLeft: 20 }}>
            <li>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
            <li>서비스는 합리적인 사유가 발생할 경우 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지 후 7일이 경과한 날부터 효력이 발생합니다.</li>
            <li>변경된 약관에 동의하지 않는 회원은 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제4조 (이용계약의 체결)">
          <ol style={{ paddingLeft: 20 }}>
            <li>이용계약은 이용자가 Google 계정을 통해 로그인하고 이 약관에 동의함으로써 체결됩니다.</li>
            <li>서비스는 다음 각 호에 해당하는 경우 이용 신청을 거부하거나 사후에 이용계약을 해지할 수 있습니다.
              <ul style={{ paddingLeft: 20, marginTop: 4 }}>
                <li>타인의 정보를 도용한 경우</li>
                <li>서비스 운영을 고의로 방해한 경우</li>
                <li>기타 관련 법령에 위반되는 경우</li>
              </ul>
            </li>
          </ol>
        </Section>

        <Section title="제5조 (서비스의 내용)">
          서비스는 다음 각 호의 기능을 제공합니다.
          <ol style={{ paddingLeft: 20, marginTop: 4 }}>
            <li>드라이브 코스 생성 및 편집 (경유지, 경로, 사진, 메모)</li>
            <li>코스 3D 애니메이션 미리보기</li>
            <li>코스에 YouTube 음악 연결</li>
            <li>코스 공유 및 탐색</li>
            <li>코스 좋아요 및 사용자 즐겨찾기</li>
            <li>실시간 교통 정보 기반 예상 소요시간 제공</li>
            <li>기타 서비스가 추가 개발하여 제공하는 기능</li>
          </ol>
        </Section>

        <Section title="제6조 (서비스 이용)">
          <ol style={{ paddingLeft: 20 }}>
            <li>서비스는 연중무휴 24시간 제공을 원칙으로 하나, 시스템 점검이나 기술적 장애 등의 사유로 일시 중단될 수 있습니다.</li>
            <li>서비스는 무료로 제공되며, 향후 유료 서비스가 추가될 경우 별도 안내합니다.</li>
            <li>비회원도 코스 탐색 등 일부 기능을 이용할 수 있으나, 코스 생성, 좋아요 등은 회원 가입 후 이용 가능합니다.</li>
          </ol>
        </Section>

        <Section title="제7조 (이용자의 의무)">
          이용자는 다음 행위를 하여서는 안 됩니다.
          <ol style={{ paddingLeft: 20, marginTop: 4 }}>
            <li>타인의 개인정보를 수집, 저장, 공개하는 행위</li>
            <li>음란, 폭력적, 차별적이거나 법령에 위반되는 콘텐츠를 등록하는 행위</li>
            <li>서비스의 안정적 운영을 방해하는 행위</li>
            <li>서비스를 이용하여 영리 목적의 광고를 게시하는 행위</li>
            <li>타인의 지적재산권을 침해하는 콘텐츠를 등록하는 행위</li>
            <li>부적절한 닉네임이나 프로필을 사용하는 행위</li>
          </ol>
        </Section>

        <Section title="제8조 (콘텐츠의 권리 및 관리)">
          <ol style={{ paddingLeft: 20 }}>
            <li>회원이 생성한 코스, 사진, 메모 등 콘텐츠의 저작권은 해당 회원에게 귀속됩니다.</li>
            <li>회원은 코스를 &quot;공개&quot;로 설정함으로써 다른 이용자가 해당 코스를 열람할 수 있도록 허락한 것으로 봅니다.</li>
            <li>서비스는 이용자가 등록한 콘텐츠가 제7조에 해당하는 경우 사전 통보 없이 삭제하거나 비공개 처리할 수 있습니다.</li>
            <li>서비스는 콘텐츠의 안전성 확인을 위해 이미지 안전성 검사를 수행할 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제9조 (위치 정보)">
          <ol style={{ paddingLeft: 20 }}>
            <li>서비스는 코스 생성 및 탐색을 위해 이용자의 위치 정보를 활용할 수 있습니다.</li>
            <li>위치 정보의 수집은 이용자의 브라우저 위치 권한 허용 시에만 이루어지며, 거부할 수 있습니다.</li>
            <li>위치 정보를 거부하더라도 수동 검색을 통해 서비스를 이용할 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제10조 (제3자 서비스)">
          서비스는 다음의 제3자 서비스를 활용하며, 각 서비스의 이용약관이 별도로 적용됩니다.
          <ul style={{ paddingLeft: 20, marginTop: 4 }}>
            <li>Google (로그인 인증)</li>
            <li>Mapbox (지도 표시 및 경로 계산)</li>
            <li>YouTube (음악 재생)</li>
            <li>Kakao (장소 검색)</li>
          </ul>
        </Section>

        <Section title="제11조 (서비스의 중단 및 변경)">
          <ol style={{ paddingLeft: 20 }}>
            <li>서비스는 사업상의 이유, 기술적 필요 등에 의해 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.</li>
            <li>서비스 중단 시 30일 전에 서비스 내 공지합니다. 단, 불가피한 사유가 있는 경우 사후에 공지할 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제12조 (면책)">
          <ol style={{ paddingLeft: 20 }}>
            <li>서비스는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로 인한 서비스 중단에 대해 책임지지 않습니다.</li>
            <li>서비스가 제공하는 경로 정보 및 예상 소요시간은 참고용이며, 실제 도로 상황과 다를 수 있습니다. 이에 따른 손해에 대해 책임지지 않습니다.</li>
            <li>이용자가 서비스를 이용하여 타인에게 손해를 끼친 경우, 해당 이용자가 책임을 부담합니다.</li>
          </ol>
        </Section>

        <Section title="제13조 (이용계약의 해지)">
          <ol style={{ paddingLeft: 20 }}>
            <li>회원은 언제든지 설정 메뉴를 통해 회원탈퇴를 할 수 있습니다.</li>
            <li>회원탈퇴 시 회원이 생성한 코스, 사진 등 모든 데이터는 삭제되며 복구할 수 없습니다.</li>
          </ol>
        </Section>

        <Section title="제14조 (분쟁 해결)">
          <ol style={{ paddingLeft: 20 }}>
            <li>서비스와 이용자 간에 발생한 분쟁은 상호 협의하여 해결합니다.</li>
            <li>협의가 이루어지지 않을 경우 대한민국 법률에 따르며, 관할 법원은 민사소송법에 따라 정합니다.</li>
          </ol>
        </Section>

        <div style={{ marginTop: 32, padding: "16px 0", borderTop: "1px solid #F4F4F4", fontSize: 12, color: "#999999" }}>
          본 약관은 2026년 4월 16일부터 시행합니다.
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
