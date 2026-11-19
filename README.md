# Last Refill

[Open Last Refill](https://coolcode.ca/lastrefill/) to measure the longest stretch of a Vancouver route without a mapped municipal drinking fountain. The included 2 km example follows City bikeway centreline segments from English Bay to Second Beach. You can also open a local GPX.

<!-- coolcode:guide -->
On the English Bay ride, compare posted year-round fountains with all mapped seasons. The Second Beach pool-deck fountain appears in the second view. Open a GPX to see distances along your own track, washroom hours and the kilometres where Vancouver’s municipal coverage ends.
<!-- /coolcode:guide -->

## Reading your route

The default counts fountains with explicit year-round operation. All mapped seasons also includes unknown seasons, so a stop in that view may be closed. City fountain data last changed in June 2022. The app shows each dataset's source date independently of its retrieval date. Washrooms show both summer and winter posted hours and reported wheelchair access. They do not count as refill stops. At English Bay Beach Park the usual winter bathhouse opening time is 10 a.m. The exports have no live closure status. [Stanley Park notices](https://vancouver.ca/parks-recreation-culture/stanley-park.aspx) and [park washroom listings](https://covapp.vancouver.ca/parkfinder/FindFacilityType.aspx?InFT=53) provide separate operating information.

GPX tracks and routes are processed in browser memory with no analytics, uploads or local storage. The app measures the geodesic length of each recorded segment and projects city points onto it in local metre coordinates. Search radii range from 50 to 500 metres. Offset measures straight-line proximity. A nearby point may require a longer detour or be inaccessible behind a gate or across a road. Use the table for the full information shown on the route strip.

Repeated passes can count when the track leaves and re-enters the search radius. Distances accumulate over recorded GPX segments, excluding the breaks between them. The City boundary partitions each segment at jurisdiction crossings. Gaps include the distance from the start of a covered stretch to its first refill, between refills, and from the last refill to the end. A covered stretch with no matching points counts in full. Outside portions do not contribute. GPX track points take precedence over route points. The size limit is 12 MB and 50,000 points.

## Sources and refresh

Contains information licensed under the [Open Government Licence – Vancouver](https://opendata.vancouver.ca/pages/licence/). City of Vancouver sources: [drinking fountains](https://opendata.vancouver.ca/explore/dataset/drinking-fountains/), [public washrooms](https://opendata.vancouver.ca/explore/dataset/public-washrooms/), [city boundary](https://opendata.vancouver.ca/explore/dataset/city-boundary/) and [bikeways](https://opendata.vancouver.ca/explore/dataset/bikeways/). The sample comes from 16 connected, identified bikeway segments. It is a route illustration independent of temporary street and park closures.

The daily refresh downloads complete exports and validates their catalogue counts, boundary continuity and sample route connections before publishing. The site builds offline from the committed snapshot. Run `python3 scripts/refresh.py` to refresh, `node --test tests/*.test.mjs`, `python3 -m unittest discover -s tests`, and `python3 scripts/build.py`. The browser smoke check is `python3 tests/browser_smoke.py` with Chromium and the test dependencies installed.
