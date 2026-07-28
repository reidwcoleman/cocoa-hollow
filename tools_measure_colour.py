#!/usr/bin/env python3
"""Compare HSV saturation / value / hue distributions between the game and the
reference, so colour is tuned to measurements instead of impressions."""
import colorsys
import pal


def stats(path, step=3):
    w, h, nch, px = pal.read_png(path)
    S, V, hues = [], [], []
    for y in range(0, h, step):
        row = y * w * nch
        for x in range(0, w, step):
            i = row + x * nch
            r, g, b = px[i] / 255, px[i + 1] / 255, px[i + 2] / 255
            hh, ss, vv = colorsys.rgb_to_hsv(r, g, b)
            S.append(ss); V.append(vv)
            if ss > 0.15 and vv > 0.12:
                hues.append(hh * 360)
    S.sort(); V.sort()
    n = len(S)
    q = lambda a, p: a[int(p * (len(a) - 1))]
    # hue histogram in 12 buckets of 30 degrees
    buckets = [0] * 12
    for hd in hues:
        buckets[min(11, int(hd // 30))] += 1
    tot = max(1, len(hues))
    return {
        'satMean': sum(S) / n, 'satP25': q(S, .25), 'satMed': q(S, .5), 'satP75': q(S, .75), 'satP90': q(S, .9),
        'valMean': sum(V) / n, 'valP10': q(V, .1), 'valMed': q(V, .5), 'valP90': q(V, .9),
        'hue': [round(100 * b / tot) for b in buckets],
    }


def cmp(name, mine, ref):
    a, b = stats(mine), stats(ref)
    print(f'\n=== {name} ===')
    print(f'{"":10}{"GAME":>8}{"REF":>8}{"delta":>9}')
    for k in ('satMean', 'satP25', 'satMed', 'satP75', 'satP90',
              'valMean', 'valP10', 'valMed', 'valP90'):
        print(f'{k:10}{a[k]:8.3f}{b[k]:8.3f}{a[k] - b[k]:+9.3f}')
    labels = ['R', 'orng', 'yel', 'ylgn', 'grn', 'sprg', 'cyan', 'azur', 'blue', 'viol', 'mgnt', 'rose']
    print('hue% game :', ' '.join(f'{l}{v:>3}' for l, v in zip(labels, a['hue'])))
    print('hue% ref  :', ' '.join(f'{l}{v:>3}' for l, v in zip(labels, b['hue'])))


if __name__ == '__main__':
    G = '/Users/reidcoleman/CocoaHollow/shots/'
    H = '/private/tmp/claude-501/-Users-reidcoleman/857ecc4d-63f4-4442-a5f2-1af92c0562ff/scratchpad/hc/'
    cmp('TOWN',   G + 'cmp_town.png',  H + '28_o8afo8haso.png')
    cmp('FOREST', G + 'cmp_grove.png', H + '13_1247.png')
    cmp('SHOP',   G + 'cmp_shop.png',  H + '20_owqofj3oj3f.png')
