import React from "react";
import "./Policy.css";

function PrivacyPolicy() {
      return (
            <div className="privacy-policy-container">
                  <h1>Privacy Policy & Terms of Service</h1>

                  <section className="company-about">
                        <h2>About Jorie HealthTech AI</h2>
                        <p>
                              Here at Jorie, we find ourselves at the forefront of HealthTech AI.
                              Being a proven leader in the revenue cycle space over the last few years,
                              our company has transitioned to become a leader in "End to End" HealthTech AI.
                              We take pride in helping the community and showing our support for incredible people.
                        </p>
                        <p>
                              Our team of professionals is dedicated to making healthcare billing processes seamless,
                              efficient, and in line with the latest regulatory standards. By integrating AI technologies
                              into revenue cycle management, we enable healthcare providers to focus more on patient care while we handle the financials.
                        </p>
                  </section>

                  <section className="hipaa-policy">
                        <h2>HIPAA Compliance</h2>
                        <p>
                              Jorie is fully committed to maintaining the highest level of data privacy and security.
                              We understand the importance of safeguarding patient information and comply with all relevant regulations,
                              including the Health Insurance Portability and Accountability Act (HIPAA).
                        </p>
                        <p>
                              Our platform ensures that all Protected Health Information (PHI) is encrypted and stored in compliance with HIPAA standards.
                              We follow strict protocols to protect sensitive data and prevent unauthorized access.
                        </p>
                        <p>
                              For more information on HIPAA compliance and our privacy practices, please reach out to our support team.
                        </p>
                  </section>

                  <section className="demo-disclaimer">
                        <h2>Disclaimer: Demo Version</h2>
                        <p>
                              Please note that the platform you are accessing is a **demo version**. It is intended solely for demonstration and educational purposes.
                              The data shown here is fictitious, and while the system simulates real-world processes, it does not handle actual medical or financial data.
                        </p>
                        <p>
                              Any resemblance to real clients, patients, or medical practices is purely coincidental.
                              <b> This demo does not constitute a real product offering and should not be considered for actual business, healthcare, or legal use. </b>
                        </p>
                  </section>

                  <section className="terms-of-service">
                        <h2>Terms of Service</h2>
                        <p>
                              By using this platform, you agree to the terms outlined in this Privacy Policy and Terms of Service.
                              We reserve the right to update or modify the terms at any time. Please check this page regularly for any updates.
                        </p>
                        <p>
                              If you have any questions or concerns regarding our policies or practices, feel free to contact us at support@joriehealth.com.
                        </p>
                  </section>

                  <footer className="privacy-footer">
                        <p>&copy; 2025 Jorie HealthTech AI | All Rights Reserved.</p>
                  </footer>
            </div>
      );
}

export default PrivacyPolicy;