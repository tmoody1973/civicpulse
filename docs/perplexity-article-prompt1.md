<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# can we structure the prompt to be used in app and return json structured output

Here’s how you can **structure the prompt for use in an app**, requesting results as JSON:

***

**Prompt Example for an App**

Search for recent stories or articles about [insert policy area, e.g., "climate change," "education," or "health care"] in U.S. Congress.
For each story, return a JSON object with the following structure:

```json
{
  "title": "[Story Title]",
  "summary": "[2-3 sentence summary]",
  "policy_area": "[e.g., Health Care, Voting Rights]",
  "link": "[URL to story]"
}
```

Return an array of such JSON objects—one for each relevant story.

***

**Sample Output**

```json
[
  {
    "title": "Shutdowns, Obamacare and the Risks of Bargaining for Policy Wins in a Crisis",
    "summary": "Congressional negotiations on health care subsidies are at the center of the current government shutdown. Lawmakers from both parties hint at possible resolution, particularly as federal nutrition programs face depletion.",
    "policy_area": "Health Care",
    "link": "https://www.nytimes.com/2025/11/01/us/politics/shutdowns-obamacare-republicans-democrats.html"
  },
  {
    "title": "Students Make Appeals to Congress to Protect K-12 Funding",
    "summary": "Student leaders advocate on Capitol Hill for continued federal investment in K-12 education, emphasizing the impact of the government shutdown on school funding and critical programs.",
    "policy_area": "Education",
    "link": "https://www.edweek.org/policy-politics/students-make-appeals-to-congress-to-protect-k-12-funding/2025/10"
  }
]
```


***

You can copy and adapt this format for any policy area your app needs!

