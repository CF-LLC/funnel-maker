// Data Removal broker list. Generated from /workspace/saas-nation/broker-list.csv (Oct 25, 2026).
// Only verified entries (opt-out page opened OK) are shown. Unverified ones stay here, hidden, until a browser
// check confirms them (merge broker-verify-results.csv, set verified + lastChecked).
// emailOptOutConfirmed is false for all: no email templates ship until a broker is confirmed to accept removal by email.
export type Broker = {
  id: string; name: string; siteUrl: string; optOutUrl: string
  /** General outline, not read from each site. */
  steps: string[]
  typicalRemovalTime: string | null
  /** YYYY-MM-DD, only for verified entries. */
  lastChecked: string | null
  verified: boolean
  privacyEmail: string | null
  emailOptOutConfirmed: boolean
  /** Hidden rows: corrected opt-out URL from the browser check (broker-verify-results.csv), pending re-verification. */
  pendingOptOutUrl: string | null
  /** Browser check result for hidden rows: live | moved | dead | blocked ... */
  verifyStatus: string | null
}
export const BROKERS: readonly Broker[] = [
  {
    "id": "spokeo",
    "name": "Spokeo",
    "siteUrl": "https://www.spokeo.com",
    "optOutUrl": "https://www.spokeo.com/optout",
    "steps": [
      "Open opt-out page",
      "search your name/state",
      "select your listing(s)",
      "submit request",
      "confirm via email link if sent"
    ],
    "typicalRemovalTime": null,
    "lastChecked": "2026-10-25",
    "verified": true,
    "privacyEmail": "privacy@spokeo.com",
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": null
  },
  {
    "id": "whitepages",
    "name": "Whitepages",
    "siteUrl": "https://www.whitepages.com",
    "optOutUrl": "https://www.whitepages.com/suppression-requests",
    "steps": [
      "Open opt-out page",
      "search your name/state",
      "select your listing(s)",
      "submit request",
      "confirm via email link if sent"
    ],
    "typicalRemovalTime": null,
    "lastChecked": "2026-10-25",
    "verified": true,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": null
  },
  {
    "id": "beenverified",
    "name": "BeenVerified",
    "siteUrl": "https://www.beenverified.com",
    "optOutUrl": "https://www.beenverified.com/app/optout/search",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": "https://www.beenverified.com/svc/optout/search/",
    "verifyStatus": "blocked"
  },
  {
    "id": "intelius",
    "name": "Intelius",
    "siteUrl": "https://www.intelius.com",
    "optOutUrl": "https://suppression.peopleconnect.us/login",
    "steps": [
      "Open opt-out page",
      "search your name/state",
      "select your listing(s)",
      "submit request",
      "confirm via email link if sent"
    ],
    "typicalRemovalTime": null,
    "lastChecked": "2026-10-25",
    "verified": true,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": null
  },
  {
    "id": "truthfinder",
    "name": "TruthFinder",
    "siteUrl": "https://www.truthfinder.com",
    "optOutUrl": "https://www.truthfinder.com/opt-out/",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": "https://suppression.peopleconnect.us/",
    "verifyStatus": "moved"
  },
  {
    "id": "instant-checkmate",
    "name": "Instant Checkmate",
    "siteUrl": "https://www.instantcheckmate.com",
    "optOutUrl": "https://www.instantcheckmate.com/opt-out/",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": "https://suppression.peopleconnect.us/",
    "verifyStatus": "moved"
  },
  {
    "id": "radaris",
    "name": "Radaris",
    "siteUrl": "https://radaris.com",
    "optOutUrl": "https://radaris.com/control/privacy",
    "steps": [
      "Open opt-out page",
      "search your name/state",
      "select your listing(s)",
      "submit request",
      "confirm via email link if sent"
    ],
    "typicalRemovalTime": null,
    "lastChecked": "2026-10-25",
    "verified": true,
    "privacyEmail": "support@atlas.net",
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": null
  },
  {
    "id": "mylife",
    "name": "MyLife",
    "siteUrl": "https://www.mylife.com",
    "optOutUrl": "https://www.mylife.com/ccpa/index.pubview",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": "https://www.mylife.com/privacyrequest",
    "verifyStatus": "moved"
  },
  {
    "id": "fastpeoplesearch",
    "name": "FastPeopleSearch",
    "siteUrl": "https://www.fastpeoplesearch.com",
    "optOutUrl": "https://www.fastpeoplesearch.com/removal",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": "https://www.fastpeoplesearch.com/optout",
    "verifyStatus": "moved"
  },
  {
    "id": "truepeoplesearch",
    "name": "TruePeopleSearch",
    "siteUrl": "https://www.truepeoplesearch.com",
    "optOutUrl": "https://www.truepeoplesearch.com/removal",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": "support@truepeoplesearch.com",
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": "blocked"
  },
  {
    "id": "peoplefinders",
    "name": "PeopleFinders",
    "siteUrl": "https://www.peoplefinders.com",
    "optOutUrl": "https://www.peoplefinders.com/opt-out",
    "steps": [
      "Open opt-out page",
      "search your name/state",
      "select your listing(s)",
      "submit request",
      "confirm via email link if sent"
    ],
    "typicalRemovalTime": null,
    "lastChecked": "2026-10-25",
    "verified": true,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": "live"
  },
  {
    "id": "peoplelooker",
    "name": "PeopleLooker",
    "siteUrl": "https://www.peoplelooker.com",
    "optOutUrl": "https://www.peoplelooker.com/f/optout/search",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": "https://www.peoplelooker.com/app/optout/search",
    "verifyStatus": "moved"
  },
  {
    "id": "peoplesmart",
    "name": "PeopleSmart",
    "siteUrl": "https://www.peoplesmart.com",
    "optOutUrl": "https://www.peoplesmart.com/optout-go",
    "steps": [
      "Open opt-out page",
      "search your name/state",
      "select your listing(s)",
      "submit request",
      "confirm via email link if sent"
    ],
    "typicalRemovalTime": null,
    "lastChecked": "2026-10-25",
    "verified": true,
    "privacyEmail": "support@peoplesmart.com",
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": null
  },
  {
    "id": "usphonebook",
    "name": "USPhoneBook",
    "siteUrl": "https://www.usphonebook.com",
    "optOutUrl": "https://www.usphonebook.com/opt-out",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": "https://www.usphonebook.com/removal",
    "verifyStatus": "moved"
  },
  {
    "id": "that-s-them",
    "name": "That's Them",
    "siteUrl": "https://thatsthem.com",
    "optOutUrl": "https://thatsthem.com/optout",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": "blocked"
  },
  {
    "id": "nuwber",
    "name": "Nuwber",
    "siteUrl": "https://nuwber.com",
    "optOutUrl": "https://nuwber.com/removal/link",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": "dead"
  },
  {
    "id": "clustrmaps",
    "name": "ClustrMaps",
    "siteUrl": "https://clustrmaps.com",
    "optOutUrl": "https://clustrmaps.com/bl/opt-out",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": "dead"
  },
  {
    "id": "searchpeoplefree",
    "name": "SearchPeopleFree",
    "siteUrl": "https://www.searchpeoplefree.com",
    "optOutUrl": "https://www.searchpeoplefree.com/opt-out",
    "steps": [
      "Open opt-out page",
      "search your name/state",
      "select your listing(s)",
      "submit request",
      "confirm via email link if sent"
    ],
    "typicalRemovalTime": "within 3 days",
    "lastChecked": "2026-10-25",
    "verified": true,
    "privacyEmail": "support@searchpeoplefree.com",
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": null
  },
  {
    "id": "cyberbackgroundchecks",
    "name": "CyberBackgroundChecks",
    "siteUrl": "https://www.cyberbackgroundchecks.com",
    "optOutUrl": "https://www.cyberbackgroundchecks.com/removal",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": "blocked"
  },
  {
    "id": "peekyou",
    "name": "PeekYou",
    "siteUrl": "https://www.peekyou.com",
    "optOutUrl": "https://www.peekyou.com/about/contact/optout/",
    "steps": [
      "Open opt-out page",
      "search your name/state",
      "select your listing(s)",
      "submit request",
      "confirm via email link if sent"
    ],
    "typicalRemovalTime": null,
    "lastChecked": "2026-10-25",
    "verified": true,
    "privacyEmail": "support@atlas.net",
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": null
  },
  {
    "id": "addresses-com",
    "name": "Addresses.com",
    "siteUrl": "https://www.addresses.com",
    "optOutUrl": "https://www.addresses.com/optout.php",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": "https://www.intelius.com/privacy-center/",
    "verifyStatus": "moved"
  },
  {
    "id": "anywho",
    "name": "AnyWho",
    "siteUrl": "https://www.anywho.com",
    "optOutUrl": "https://www.anywho.com/optout",
    "steps": [
      "Open opt-out page",
      "search your name/state",
      "select your listing(s)",
      "submit request",
      "confirm via email link if sent"
    ],
    "typicalRemovalTime": null,
    "lastChecked": "2026-10-25",
    "verified": true,
    "privacyEmail": "privacy@spokeo.com",
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": null
  },
  {
    "id": "411-com",
    "name": "411.com",
    "siteUrl": "https://www.411.com",
    "optOutUrl": "https://www.whitepages.com/suppression-requests",
    "steps": [
      "Open opt-out page",
      "search your name/state",
      "select your listing(s)",
      "submit request",
      "confirm via email link if sent"
    ],
    "typicalRemovalTime": null,
    "lastChecked": "2026-10-25",
    "verified": true,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": null
  },
  {
    "id": "zabasearch",
    "name": "ZabaSearch",
    "siteUrl": "https://www.zabasearch.com",
    "optOutUrl": "https://www.intelius.com/opt-out",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": "https://suppression.peopleconnect.us/",
    "verifyStatus": "moved"
  },
  {
    "id": "ussearch",
    "name": "USSearch",
    "siteUrl": "https://www.ussearch.com",
    "optOutUrl": "https://www.ussearch.com/opt-out/submit/",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": "https://app.ussearch.com/privacy-center/",
    "verifyStatus": "moved"
  },
  {
    "id": "classmates",
    "name": "Classmates",
    "siteUrl": "https://www.classmates.com",
    "optOutUrl": "https://suppression.peopleconnect.us/login",
    "steps": [
      "Open opt-out page",
      "search your name/state",
      "select your listing(s)",
      "submit request",
      "confirm via email link if sent"
    ],
    "typicalRemovalTime": null,
    "lastChecked": "2026-10-25",
    "verified": true,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": null
  },
  {
    "id": "acxiom",
    "name": "Acxiom",
    "siteUrl": "https://www.acxiom.com",
    "optOutUrl": "https://isapps.acxiom.com/optout/optout.aspx",
    "steps": [
      "Open opt-out page",
      "search your name/state",
      "select your listing(s)",
      "submit request",
      "confirm via email link if sent"
    ],
    "typicalRemovalTime": null,
    "lastChecked": "2026-10-25",
    "verified": true,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": null
  },
  {
    "id": "epsilon",
    "name": "Epsilon",
    "siteUrl": "https://www.epsilon.com",
    "optOutUrl": "https://legal.epsilon.com/dsr/",
    "steps": [
      "Open opt-out page",
      "search your name/state",
      "select your listing(s)",
      "submit request",
      "confirm via email link if sent"
    ],
    "typicalRemovalTime": null,
    "lastChecked": "2026-10-25",
    "verified": true,
    "privacyEmail": "privacyofficer@publicisgroupe.com",
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": null
  },
  {
    "id": "oracle-advertising",
    "name": "Oracle Advertising",
    "siteUrl": "https://www.oracle.com",
    "optOutUrl": "https://www.oracle.com/legal/privacy/marketing-cloud-data-cloud-privacy-policy.html",
    "steps": [
      "Open opt-out page",
      "search your name/state",
      "select your listing(s)",
      "submit request",
      "confirm via email link if sent"
    ],
    "typicalRemovalTime": null,
    "lastChecked": "2026-10-25",
    "verified": true,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": null
  },
  {
    "id": "lexisnexis",
    "name": "LexisNexis",
    "siteUrl": "https://www.lexisnexis.com",
    "optOutUrl": "https://optout.lexisnexis.com/",
    "steps": [
      "Open opt-out page",
      "search your name/state",
      "select your listing(s)",
      "submit request",
      "confirm via email link if sent"
    ],
    "typicalRemovalTime": null,
    "lastChecked": "2026-10-25",
    "verified": true,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": null
  },
  {
    "id": "checkpeople",
    "name": "CheckPeople",
    "siteUrl": "https://www.checkpeople.com",
    "optOutUrl": "https://www.checkpeople.com/opt-out",
    "steps": [
      "Open opt-out page",
      "search your name/state",
      "select your listing(s)",
      "submit request",
      "confirm via email link if sent"
    ],
    "typicalRemovalTime": "within 5-7 days",
    "lastChecked": "2026-10-25",
    "verified": true,
    "privacyEmail": "support@checkpeople.com",
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": null
  },
  {
    "id": "advanced-background-checks",
    "name": "Advanced Background Checks",
    "siteUrl": "https://www.advancedbackgroundchecks.com",
    "optOutUrl": "https://www.advancedbackgroundchecks.com/removal",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": "https://www.advancedbackgroundchecks.com/do-not-sell",
    "verifyStatus": "moved"
  },
  {
    "id": "familytreenow",
    "name": "FamilyTreeNow",
    "siteUrl": "https://www.familytreenow.com",
    "optOutUrl": "https://www.familytreenow.com/optout",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": "blocked"
  },
  {
    "id": "publicdatausa",
    "name": "PublicDataUSA",
    "siteUrl": "https://www.publicdatausa.com",
    "optOutUrl": "https://www.publicdatausa.com/remove.php",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": "dead"
  },
  {
    "id": "pipl",
    "name": "Pipl",
    "siteUrl": "https://pipl.com",
    "optOutUrl": "https://pipl.com/personal-information-removal-request",
    "steps": [
      "Open opt-out page",
      "search your name/state",
      "select your listing(s)",
      "submit request",
      "confirm via email link if sent"
    ],
    "typicalRemovalTime": null,
    "lastChecked": "2026-10-25",
    "verified": true,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": null
  },
  {
    "id": "spytox",
    "name": "Spytox",
    "siteUrl": "https://www.spytox.com",
    "optOutUrl": "https://www.spytox.com/opt-out",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": "dead"
  },
  {
    "id": "neighbor-report",
    "name": "Neighbor.report",
    "siteUrl": "https://neighbor.report",
    "optOutUrl": "https://neighbor.report/remove",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": "dead"
  },
  {
    "id": "peoplefinder-kwold",
    "name": "PeopleFinder (Kwold)",
    "siteUrl": "https://www.peoplefinder.com",
    "optOutUrl": "https://www.peoplefinder.com/optout.php",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": "https://www.intelius.com/privacy-center/",
    "verifyStatus": "moved"
  },
  {
    "id": "veripages",
    "name": "Veripages",
    "siteUrl": "https://veripages.com",
    "optOutUrl": "https://veripages.com/page/optout",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": "https://veripages.com/inner/removal-service?s=footer",
    "verifyStatus": "moved"
  },
  {
    "id": "smart-background-checks",
    "name": "Smart Background Checks",
    "siteUrl": "https://www.smartbackgroundchecks.com",
    "optOutUrl": "https://www.smartbackgroundchecks.com/optout",
    "steps": [
      "Open opt-out page",
      "search your name/state",
      "select your listing(s)",
      "submit request",
      "confirm via email link if sent"
    ],
    "typicalRemovalTime": null,
    "lastChecked": "2026-10-25",
    "verified": true,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": null
  },
  {
    "id": "infotracer",
    "name": "InfoTracer",
    "siteUrl": "https://infotracer.com",
    "optOutUrl": "https://infotracer.com/optout/",
    "steps": [
      "Open opt-out page",
      "search your name/state",
      "select your listing(s)",
      "submit request",
      "confirm via email link if sent"
    ],
    "typicalRemovalTime": "within 45 days",
    "lastChecked": "2026-10-25",
    "verified": true,
    "privacyEmail": "privacy@infotracer.com",
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": null
  },
  {
    "id": "cocofinder",
    "name": "CocoFinder",
    "siteUrl": "https://cocofinder.com",
    "optOutUrl": "https://cocofinder.com/remove-my-info",
    "steps": [],
    "typicalRemovalTime": null,
    "lastChecked": null,
    "verified": false,
    "privacyEmail": null,
    "emailOptOutConfirmed": false,
    "pendingOptOutUrl": null,
    "verifyStatus": "blocked"
  }
]
export const VISIBLE_BROKERS: readonly Broker[] = BROKERS.filter((b) => b.verified)
