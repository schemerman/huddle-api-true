// Huddle's Privacy Policy and Terms of Use, shown at /privacy and /terms.
// Keep these accurate when the app changes (new data, new providers, new features).

export const LEGAL_EFFECTIVE_DATE = "16 October 2026";
export const SUPPORT_EMAIL = "huddleappsupport@gmail.com";

export type LegalParagraph = string | { bullets: string[] };
export type LegalSection = { heading: string; body: LegalParagraph[] };
export type LegalDoc = { title: string; intro: string; sections: LegalSection[] };

export const PRIVACY_POLICY: LegalDoc = {
  title: "Privacy Policy",
  intro:
    "This policy explains what personal data Huddle collects, why, who can see it, and the choices and rights you have. We've tried to keep it short and in plain English.",
  sections: [
    {
      heading: "1. Who we are",
      body: [
        "Huddle is a free-to-play football prediction app for university students. In this policy, \"Huddle\", \"we\" and \"us\" mean the team that runs the app.",
        "We decide how your personal data is used, which makes us the data controller under UK data protection law (the UK GDPR and the Data Protection Act 2018).",
        `Questions about this policy or your data: ${SUPPORT_EMAIL}.`,
      ],
    },
    {
      heading: "2. What we collect",
      body: [
        "Details you give us when you sign up:",
        {
          bullets: [
            "Email address and password. Your password is handled by our sign-in provider and stored only in encrypted (hashed) form; we can't see it.",
            "Date of birth, used to check you are 18 or over.",
            "Username, display name and avatar colour.",
          ],
        },
        "What you do in Huddle:",
        {
          bullets: [
            "Your predictions, points, win rate and daily bonus claims.",
            "Posts, comments, likes and the people you follow.",
            "The huddles (groups) you create or join.",
            "Direct messages and huddle chat messages.",
            "Photos you upload to posts or chats.",
          ],
        },
        "Technical data:",
        {
          bullets: [
            "A sign-in token saved in your browser or device so you stay logged in, plus a few app settings (for example, which chats you've read).",
            "Basic technical logs kept by our hosting providers, such as the time of a request, what was requested and your IP address, used to keep Huddle running and secure.",
          ],
        },
        "We don't use advertising or tracking cookies, and we don't use analytics tools that follow you around the web.",
      ],
    },
    {
      heading: "3. How we use it and why we're allowed to",
      body: [
        {
          bullets: [
            "To create and run your account, record your predictions and points, and show your posts and messages. This is necessary to provide the service you asked for (contract).",
            "To check you are 18 or over and to keep Huddle a free, lawful game (legal obligation and legitimate interests).",
            "To keep Huddle safe and fair: preventing cheating, abuse and spam, and enforcing our Terms of Use (legitimate interests).",
            "To fix problems and improve the app (legitimate interests).",
            "To reply when you contact us (legitimate interests).",
          ],
        },
        "We never sell your personal data and we don't use it for advertising.",
      ],
    },
    {
      heading: "4. What other people can see",
      body: [
        {
          bullets: [
            "Other Huddle users can see your username, display name, avatar colour, points, win rate, predictions and results, posts, comments, likes, followers and following, and your place on leaderboards.",
            "Your email address and date of birth are never shown to other users.",
            "Direct messages can be read only by you and the person you're messaging.",
            "Huddle chat messages can be read by the current members of that huddle.",
            "Photos can be opened by anyone who has the photo's link, so only share photos you're happy for others to see.",
            "Remember that anyone you message can screenshot or share what you send.",
          ],
        },
        "The Huddle team can access data when needed to run the service, investigate reports and keep people safe.",
      ],
    },
    {
      heading: "5. Who we share it with",
      body: [
        "We use these service providers, who process data only on our instructions:",
        {
          bullets: [
            "Supabase: sign-in, database, photo storage and live chat (servers in the EU, Ireland).",
            "Render: our server, which settles predictions and runs the points system.",
            "Vercel: hosts the Huddle website.",
          ],
        },
        "Fixtures, odds and results come from The Odds API and ESPN. We don't send them your personal data. Team badges load from ESPN's image servers, which (like any website you load images from) can see your IP address.",
        "We may also share data if the law requires it, to protect someone's safety, or as part of a sale or reorganisation of Huddle, in which case this policy would continue to apply.",
      ],
    },
    {
      heading: "6. International transfers",
      body: [
        "Some of our providers may process data outside the UK, for example in the United States. When that happens we rely on the safeguards UK law allows, such as UK adequacy regulations or the UK International Data Transfer Addendum.",
      ],
    },
    {
      heading: "7. How long we keep it",
      body: [
        {
          bullets: [
            "We keep your data for as long as your account is open.",
            "If you ask us to delete your account, we delete or anonymise your personal data, including your posts, comments, messages and photos, within 30 days. We may keep a minimum amount for longer if the law requires it or to resolve a dispute.",
            "Backups and hosting logs are kept only for a limited period and are then overwritten.",
          ],
        },
      ],
    },
    {
      heading: "8. Your rights",
      body: [
        "Under UK law you can ask us to:",
        {
          bullets: [
            "give you a copy of your personal data;",
            "correct data that's wrong;",
            "delete your data;",
            "restrict or object to how we use it;",
            "send your data to you or another service in a portable format.",
          ],
        },
        `To use any of these rights, email ${SUPPORT_EMAIL} from the address on your account. We'll reply within one month and may need to confirm it's you.`,
        "If you're unhappy with how we handle your data, you can complain to the Information Commissioner's Office (ico.org.uk, 0303 123 1113). We'd appreciate the chance to put things right first.",
      ],
    },
    {
      heading: "9. Age",
      body: [
        "Huddle is only for people aged 18 or over. We check your date of birth when you sign up. If we find out an account belongs to someone under 18, we will delete it.",
      ],
    },
    {
      heading: "10. Security",
      body: [
        "Data is sent over encrypted (HTTPS) connections, and database rules limit who can read private information such as messages. No online service can be completely secure, so please use a strong password you don't use anywhere else, and tell us straight away if you think someone has accessed your account.",
      ],
    },
    {
      heading: "11. Changes to this policy",
      body: [
        "We may update this policy. If we make significant changes we'll let you know in the app before they take effect. The date at the top shows when it last changed.",
      ],
    },
    {
      heading: "12. Contact",
      body: [`Email ${SUPPORT_EMAIL} with any question or request about your privacy.`],
    },
  ],
};

export const TERMS_OF_USE: LegalDoc = {
  title: "Terms of Use",
  intro:
    "These terms are the rules for using Huddle. By creating an account or using Huddle you agree to them and to our Privacy Policy. If you don't agree, please don't use Huddle.",
  sections: [
    {
      heading: "1. Who can use Huddle",
      body: [
        {
          bullets: [
            "You must be 18 or over.",
            "Give accurate details when you sign up, and keep them up to date.",
            "One account per person. Your account is personal to you and can't be sold or transferred.",
            "Keep your password safe. You're responsible for what happens on your account, so tell us straight away if you think someone else has used it.",
          ],
        },
      ],
    },
    {
      heading: "2. Free to play, not gambling",
      body: [
        {
          bullets: [
            "Huddle is a free-to-play prediction game for entertainment only. You never pay to take part.",
            "Points have no money value. They can't be bought, sold, transferred for value, or exchanged for cash, prizes or anything else of value.",
            "Point multipliers are shown only to work out how many points a prediction is worth. They are not betting offers, and Huddle is not a gambling service or connected to any bookmaker.",
            "If we ever run a competition with prizes, it will be free to enter and will have its own rules.",
            "If gambling is causing you or someone you know problems, free and confidential help is available from GamCare (0808 8020 133) and BeGambleAware.org.",
          ],
        },
      ],
    },
    {
      heading: "3. Predictions, points and fair play",
      body: [
        {
          bullets: [
            "Predictions are settled automatically on the result after 90 minutes plus stoppage time. Extra time and penalty shootouts don't count.",
            "Fixtures, odds and results come from third parties and can be late or wrong. We may correct predictions, points, results and leaderboards at any time, including after they've been settled.",
            "We may change how points, bonuses, odds, badges and leaderboards work, or reset points for everyone.",
            "Don't cheat. That includes bots or scripts, multiple accounts, exploiting bugs, or interfering with Huddle or its servers. We may remove points or suspend or close accounts that cheat.",
          ],
        },
      ],
    },
    {
      heading: "4. Your content",
      body: [
        "You keep ownership of what you post, including photos and messages. You give Huddle a non-exclusive, worldwide, royalty-free licence to store, display and share that content within Huddle so we can run the service. The licence ends when you delete the content or your account, except for copies other people have already shared or that we must keep by law.",
        "Don't post or send anything that:",
        {
          bullets: [
            "is illegal, or encourages illegal activity;",
            "threatens, harasses, bullies or intimidates anyone;",
            "is hateful or discriminatory;",
            "is sexually explicit or graphically violent;",
            "is false and damaging about a real person (defamatory);",
            "shares someone else's private information, or photos of other people without their permission;",
            "is spam or advertising, or infringes someone else's rights (for example, copyright).",
          ],
        },
        `We may remove content and suspend or close accounts that break these rules. To report something, email ${SUPPORT_EMAIL}.`,
      ],
    },
    {
      heading: "5. Messages and huddles",
      body: [
        "Direct messages and huddle chats are private to the people in them, but anyone in a conversation can screenshot or share it, so think before you send. Be respectful: the rules in section 4 apply to messages too.",
      ],
    },
    {
      heading: "6. Names, logos and sports data",
      body: [
        "Huddle is not affiliated with, endorsed by or sponsored by the Premier League, UEFA, ESPN, The Odds API or any football club. Competition names, club names, logos and badges belong to their owners and are used only to identify matches.",
      ],
    },
    {
      heading: "7. The service",
      body: [
        "Huddle is provided \"as is\" and \"as available\". We work to keep it running smoothly, but we can't promise it will always be available or free of errors. We may change, pause or stop any part of Huddle.",
      ],
    },
    {
      heading: "8. Our liability",
      body: [
        {
          bullets: [
            "Nothing in these terms limits our liability for death or personal injury caused by our negligence, for fraud, or for anything else the law doesn't allow us to limit. Your legal rights as a consumer are not affected.",
            "Huddle is free and points have no value, so we're not responsible for lost points, rankings or content, or for losses that weren't a foreseeable result of us breaking these terms.",
            "As far as the law allows, our total liability to you for anything to do with Huddle is limited to £50.",
          ],
        },
      ],
    },
    {
      heading: "9. Ending your account",
      body: [
        `You can stop using Huddle at any time, and ask us to delete your account by emailing ${SUPPORT_EMAIL}. We may suspend or close your account if you break these terms, if the law requires it, or to protect other people.`,
      ],
    },
    {
      heading: "10. Changes to these terms",
      body: [
        "We may update these terms. If we make significant changes we'll let you know in the app before they take effect. If you keep using Huddle after that, you accept the new terms.",
      ],
    },
    {
      heading: "11. Law",
      body: [
        "These terms are governed by the law of England and Wales, and disputes will be dealt with by the courts of England and Wales. If you live in Scotland or Northern Ireland, you can also bring a claim in your local courts.",
      ],
    },
    {
      heading: "12. Contact",
      body: [`Questions about these terms: ${SUPPORT_EMAIL}.`],
    },
  ],
};
