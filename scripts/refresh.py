"""Build route facilities, a closed jurisdiction boundary and a sourced example."""
from city import dataset, publish


def coords(row):
    point = row['geo_point_2d']
    return [round(point['lon'], 6), round(point['lat'], 6)]


def boundary_ring(parts):
    lines = [list(part) for part in parts]
    result = lines.pop(0)
    while lines:
        for i, line in enumerate(lines):
            if result[-1] in (line[0], line[-1]):
                if result[-1] == line[-1]:
                    line.reverse()
                result.extend(line[1:])
                lines.pop(i)
                break
        else:
            raise ValueError('City boundary no longer forms one ring')
    if result[0] != result[-1]:
        raise ValueError('Open boundary')
    return [[round(x, 6), round(y, 6)] for x, y in result]


def main():
    fountains, fd = dataset('drinking-fountains')
    washrooms, wd = dataset('public-washrooms')
    boundary, bd = dataset('city-boundary')
    bikes, rd = dataset('bikeways')
    facilities = []
    for row in fountains:
        if row['geo_point_2d']:
            facilities.append(dict(kind='Fountain', id=row['mapid'], name=(row['name'] or row['location'] or row['mapid']).split('\n')[-1].strip(), location=row['location'], season=row['in_operation'], xy=coords(row)))
    for row in washrooms:
        if row['geo_point_2d']:
            facilities.append(dict(kind='Washroom', name=row['park_name'] or row['location'] or row['type'], location=row['location'], summer=row['summer_hours'], winter=row['winter_hours'], accessible=row['wheelchair_access'], note=row['note'], xy=coords(row)))
    # Travel the open Beach and Seaside centreline from English Bay to Second Beach.
    ids = [2634,1101,3685,2333,849,2582,1830,3025,1542,2631,-2894,3317,2712,3283,42,1310]
    by_id = {int(row['object_id']): row for row in bikes}
    route = []
    for signed in ids:
        line = by_id[abs(signed)]['geom']['geometry']['coordinates'][::1 if signed > 0 else -1]
        if route and any(abs(a-b) > 0.00005 for a,b in zip(route[-1],line[0])):
            raise ValueError('Example bikeway segments no longer connect')
        route.extend(line if not route else line[1:])
    unknown = sum(not row['in_operation'] for row in fountains)
    ring = boundary_ring(boundary[0]['geom']['geometry']['coordinates'])
    if len(facilities) < 300 or len(route) < 20:
        raise ValueError('Facility or route coverage changed')
    dates = dict(fountains=fd, washrooms=wd, boundary=bd, bikeways=rd)
    publish(dict(facilities=facilities, boundary=ring, route=[[round(x,6),round(y,6)] for x,y in route], bikewayIds=[abs(i) for i in ids]), dict(count=len(facilities), fountains=len(fountains), washrooms=len(washrooms), unknown=unknown, latest=max(fd,wd), dates=dates))


if __name__ == '__main__':
    main()
