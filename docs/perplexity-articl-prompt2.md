<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Search for recent stories or articles about [artificial intelligence] in U.S. Congress.

For each story, return a JSON object with the following structure:
json
{
"title": "[Story Title]",
"summary": "[2-3 sentence summary]",
"policy_area": "[e.g., Health Care, Voting Rights]",
"link": "[URL to story]"
}

Return an array of such JSON objects—one for each relevant story.

```json
[
  {
    "title": "An optimistic story about AI and hacking",
    "summary": "Congress is considering the Guidelines for User Verification and Responsible Dialogue bill to regulate AI chatbots, especially after lawsuits about AI’s impact on minors. This legislation would require companies to verify the ages of users and limit AI chatbot interactions with children, following recent publicized incidents.",
    "policy_area": "Artificial Intelligence",
    "link": "https://www.politico.com/newsletters/digital-future-daily/2025/10/29/an-optimistic-story-about-ai-and-hacking-00627163"
  },
  {
    "title": "Shutdown could delay Congress 'getting serious' about AI policy",
    "summary": "The government shutdown has stalled congressional progress on artificial intelligence legislation, including key bills like the National Defense Authorization Act and AI sandbox proposals. Experts warn this may further delay a comprehensive national AI policy framework.",
    "policy_area": "Artificial Intelligence",
    "link": "https://www.nextgov.com/artificial-intelligence/2025/10/shutdown-could-delay-congress-getting-serious-about-ai-policy/408730/"
  },
  {
    "title": "Mom who sued Character.AI over son's suicide says the platform's new teen policy comes 'too late'",
    "summary": "Congress is being called on to ban AI bots for children, while advocates and victims' families emphasize the importance of robust age verification and data protection measures in AI platforms interacting with minors. Such scrutiny follows lawsuits and legislative proposals triggered by tragic incidents involving AI chatbots.",
    "policy_area": "Artificial Intelligence",
    "link": "https://www.nbcnews.com/tech/tech-news/characterai-bans-minors-response-megan-garcia-parent-suing-company-rcna240985"
  },
  {
    "title": "A House Democrat this week proposed a measure that would ...",
    "summary": "A new proposal in Congress from a House Democrat would largely prohibit psychologists and counselors from using artificial intelligence in their practices. The measure aims to ensure ethical use of AI in sensitive clinical settings.",
    "policy_area": "Artificial Intelligence",
    "link": "https://www.facebook.com/WMBBTV/posts/a-house-democrat-this-week-proposed-a-measure-that-would-largely-prevent-psychol/1260323962806746/"
  },
  {
    "title": "Congress makes incremental progress on AI policy",
    "summary": "Congressional hearings have focused on election security, consumer privacy, and AI transparency, while both the House and Senate have active AI working groups. Despite drafting over 120 AI-related bills in this session, few have achieved full passage, pointing to slow but ongoing legislative progress.",
    "policy_area": "Artificial Intelligence",
    "link": "https://www.naco.org/news/congress-makes-incremental-progress-ai-policy"
  },
  {
    "title": "Open the pod bay doors, Congress",
    "summary": "Lawmakers are urged to accelerate action on regulating automated AI systems to maintain national leadership and address transparency, accountability, and strategic risk concerns. The article highlights the need for Congress to introduce oversight mechanisms for advanced AI development.",
    "policy_area": "Artificial Intelligence",
    "link": "https://thehill.com/opinion/technology/5542073-us-china-ai-competition/"
  },
  {
    "title": "Americans Want AI Guardrails to Protect Local Journalism",
    "summary": "A recent survey shows 77% of Americans want Congress to pass legislation making it illegal for AI to copy or reproduce local journalism without consent. The survey underscores the public’s concerns about AI's impact on local news and calls for regulatory action.",
    "policy_area": "Artificial Intelligence",
    "link": "https://www.nabshow.com/article/new-survey-americans-want-ai-guardrails-to-protect-local-journalism/"
  }
]
```

<span style="display:none">[^1][^2][^3][^4][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://www.politico.com/newsletters/digital-future-daily/2025/10/29/an-optimistic-story-about-ai-and-hacking-00627163

[^2]: https://www.nextgov.com/artificial-intelligence/2025/10/shutdown-could-delay-congress-getting-serious-about-ai-policy/408730/

[^3]: https://www.nbcnews.com/tech/tech-news/characterai-bans-minors-response-megan-garcia-parent-suing-company-rcna240985

[^4]: https://www.facebook.com/WMBBTV/posts/a-house-democrat-this-week-proposed-a-measure-that-would-largely-prevent-psychol/1260323962806746/

[^5]: https://www.naco.org/news/congress-makes-incremental-progress-ai-policy

[^6]: https://www.rstreet.org/commentary/shutdown-could-delay-congress-getting-serious-about-ai-policy/

[^7]: https://thehill.com/opinion/technology/5542073-us-china-ai-competition/

[^8]: https://www.nabshow.com/article/new-survey-americans-want-ai-guardrails-to-protect-local-journalism/

[^9]: https://wmo.int/news/media-centre/world-meteorological-congress-endorses-actions-promote-ai-forecasts-and-warnings

