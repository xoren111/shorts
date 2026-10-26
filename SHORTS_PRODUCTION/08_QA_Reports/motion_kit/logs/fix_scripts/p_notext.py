import sys; p=sys.argv[1]; s=open(p).read()
for a in ['<Kinetic fromWord={0} toWord={3} preset="slam" zone="upper" />', """<Kinetic fromWord={21} toWord={22} preset="slam" display={{21: '3'}} keyWords={[21]} keyScale={2.2} zone="upper" t1={t1} />"""]:
    assert a in s; s=s.replace(a, '')
open(p,'w').write(s)
