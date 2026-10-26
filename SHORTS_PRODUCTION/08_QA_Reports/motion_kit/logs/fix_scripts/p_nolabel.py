import sys; p=sys.argv[1]; s=open(p).read()
a='<TrackedLabel text="Steamboat Bill, Jr." sub="1928" t0={cut + 0.26} t1={t1} size={50} />'
assert a in s; s=s.replace(a,''); open(p,'w').write(s)
