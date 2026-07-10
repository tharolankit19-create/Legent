import csv
rows = sorted(csv.DictReader(open("data/scored_leads.csv")),
              key=lambda r: -int(r["intent_score"]))
print(f"\n{len(rows)} qualified | avg {sum(int(r['intent_score']) for r in rows)//max(len(rows),1)}\n")
for r in rows[:20]:
    print(f"{r['intent_score']:>3}  {r['name']:<22} {r['title'][:18]:<20} {r['company'][:22]:<24} {r['email']}")
