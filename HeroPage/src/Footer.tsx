import styled from "styled-components";

// Styled Components for the footer
const FooterContainer = styled.div`
  background-color: #1f1f1f;
  color: #bbb;
  padding: 20px;
  width: 100%;
  bottom: 0;
  position: relative;
  text-align: center;
  border-top: 1px solid #333;
  padding-top: 20px;
`;

const FooterText = styled.p`
  font-size: 14px;
  margin: 0;
`;

const SocialIcons = styled.div`
  margin-top: 10px;
`;

const SocialIcon = styled.a`
  color: #bbb;
  font-size: 20px;
  margin: 0 15px;
  text-decoration: none;
  transition: color 0.3s ease;

  &:hover {
    color: #58a6ff;
  }
`;

const Footer = () => {
  return (
    <FooterContainer>
      <FooterText>&copy; 2025 PyREX. All rights reserved.</FooterText>
      <SocialIcons>
        <SocialIcon
          href="https://twitter.com"
          target="_blank"
          aria-label="Twitter"
        >
          <i className="fab fa-twitter"></i>
        </SocialIcon>
        <SocialIcon
          href="https://github.com"
          target="_blank"
          aria-label="GitHub"
        >
          <i className="fab fa-github"></i>
        </SocialIcon>
        <SocialIcon
          href="https://linkedin.com"
          target="_blank"
          aria-label="LinkedIn"
        >
          <i className="fab fa-linkedin"></i>
        </SocialIcon>
      </SocialIcons>
    </FooterContainer>
  );
};

export default Footer;
