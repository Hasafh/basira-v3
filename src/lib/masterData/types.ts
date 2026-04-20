// ── Master Data Types ─────────────────────────────────────────

export interface City {
  id:   string;
  name: string;
}

export interface District {
  id:      string;
  cityId:  string;
  name:    string;
  aliases: string[];   // e.g. ["Al Narjis", "النرجيس"]
}

export interface MasterData {
  cities:    City[];
  districts: District[];
}

// ── Result of a district lookup ──────────────────────────────

export interface DistrictMatch {
  district:    District;
  score:       number;     // 0–1, 1 = exact
  matchedAlias: string;    // which alias/name triggered the match
}
