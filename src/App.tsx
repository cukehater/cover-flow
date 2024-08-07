import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import './App.scss'
import gsap from 'gsap'
import { Draggable, ScrollTrigger } from 'gsap/all'

gsap.registerPlugin(ScrollTrigger)
gsap.registerPlugin(Draggable)

export default function App() {
  const gsapRef = useRef(null)
  const [data, setData] = useState([])

  const fetchData = async () => {
    const response = await fetch('/src/data/data.json')
    const data = await response.json()
    setData(data)
  }

  useEffect(() => {
    fetchData()
  }, [])

  useLayoutEffect(() => {
    if (data.length === 0) return

    const ctx = gsap.context(() => {
      if (!gsapRef.current) return

      const boxes = [
        ...(gsapRef.current as HTMLElement).querySelectorAll('.box')
      ]

      gsap.set(boxes, {
        yPercent: -50
      })

      const STAGGER = 0.1 // 각 박스의 애니메이션 시작 간격
      const DURATION = 2 // 애니메이션 지속 시간
      const OFFSET = 0 // 애니메이션 시작 오프셋

      // 무한 반복 애니메이션 타임라인 생성
      const LOOP = gsap.timeline({
        paused: true,
        repeat: -1,
        ease: 'none'
      })

      const expandBoxes = [...boxes, ...boxes, ...boxes] // 박스 배열을 3배로 확장

      // 각 박스에 대해 애니메이션 설정
      expandBoxes.forEach((BOX, index) => {
        const tl = gsap
          .timeline()
          .set(BOX, {
            xPercent: 250,
            rotateY: -50,
            opacity: 0,
            scale: 0.5
          })
          // 투명도 및 크기 애니메이션
          .to(
            BOX,
            {
              opacity: 1,
              scale: 1,
              duration: 0.1
            },
            0
          )
          .to(
            BOX,
            {
              opacity: 0,
              scale: 0.5,
              duration: 0.1
            },
            0.9
          )
          // 수평 이동 애니메이션
          .fromTo(
            BOX,
            {
              xPercent: 250
            },
            {
              xPercent: -350,
              duration: 1,
              immediateRender: false,
              ease: 'power1.inOut'
            },
            0
          )
          // 회전 애니메이션
          .fromTo(
            BOX,
            {
              rotateY: -50
            },
            {
              rotateY: 50,
              immediateRender: false,
              duration: 1,
              ease: 'power4.inOut'
            },
            0
          )
          // 크기 및 Z축 애니메이션
          .to(
            BOX,
            {
              z: 100,
              scale: 1.25,
              duration: 0.1,
              repeat: 1,
              yoyo: true
            },
            0.4
          )
          .fromTo(
            BOX,
            {
              zIndex: 1
            },
            {
              zIndex: boxes.length,
              repeat: 1,
              yoyo: true,
              ease: 'none',
              duration: 0.5,
              immediateRender: false
            },
            0
          )
        LOOP.add(tl, index * STAGGER) // 타임라인에 박스 애니메이션 추가
      })

      const CYCLE_DURATION = STAGGER * boxes.length // 전체 애니메이션 주기
      const START_TIME = CYCLE_DURATION + DURATION * 0.5 + OFFSET // 애니메이션 시작 시간

      // 무한 반복 애니메이션 설정
      const LOOP_HEAD = gsap.fromTo(
        LOOP,
        {
          totalTime: START_TIME
        },
        {
          totalTime: `+=${CYCLE_DURATION}`,
          duration: 1,
          ease: 'none',
          repeat: -1,
          paused: true
        }
      )

      const PLAYHEAD = {
        position: 0
      }

      const POSITION_WRAP = gsap.utils.wrap(0, LOOP_HEAD.duration()) // 애니메이션 위치 래핑

      // 스크럽 애니메이션 설정
      const SCRUB = gsap.to(PLAYHEAD, {
        position: 0,
        onUpdate: () => {
          LOOP_HEAD.totalTime(POSITION_WRAP(PLAYHEAD.position))
        },
        paused: true,
        duration: 0.25,
        ease: 'power3'
      })

      let iteration = 0
      // 스크롤 트리거 설정
      const TRIGGER = ScrollTrigger.create({
        start: 0,
        end: '+=2000',
        horizontal: false,
        pin: (gsapRef.current as HTMLElement).querySelector('.boxes'),
        onUpdate: self => {
          const SCROLL = self.scroll()
          if (SCROLL > self.end - 1) {
            // 시간 앞으로 이동
            WRAP(1, 1)
          } else if (SCROLL < 1 && self.direction < 0) {
            // 시간 뒤로 이동
            WRAP(-1, self.end - 1)
          } else {
            const NEW_POS = (iteration + self.progress) * LOOP_HEAD.duration()
            SCRUB.vars.position = NEW_POS
            SCRUB.invalidate().restart()
          }
        }
      })

      // 애니메이션 래핑 함수
      const WRAP = (iterationDelta: number, scrollTo: number) => {
        iteration += iterationDelta
        TRIGGER.scroll(scrollTo)
        TRIGGER.update()
      }

      const SNAP = gsap.utils.snap(1 / boxes.length) // 박스 위치 스냅

      // 진행도를 스크롤 위치로 변환하는 함수
      const progressToScroll = (progress: number) =>
        gsap.utils.clamp(
          1,
          TRIGGER.end - 1,
          gsap.utils.wrap(0, 1, progress) * TRIGGER.end
        )

      // 특정 위치로 스크롤하는 함수
      const scrollToPosition = (position: number) => {
        const SNAP_POS = SNAP(position)
        const PROGRESS =
          (SNAP_POS - LOOP_HEAD.duration() * iteration) / LOOP_HEAD.duration()
        const SCROLL = progressToScroll(PROGRESS)
        if (PROGRESS >= 1 || PROGRESS < 0)
          return WRAP(Math.floor(PROGRESS), SCROLL)
        TRIGGER.scroll(SCROLL)
      }

      // 스크롤 종료 시 위치로 스크롤
      ScrollTrigger.addEventListener('scrollEnd', () =>
        scrollToPosition(SCRUB.vars.position as number)
      )

      // '.box' 요소의 display를 'block'으로 설정
      gsap.set('.box', { display: 'block' })

      // 버튼의 z축 위치 설정
      gsap.set('button', {
        z: 200
      })

      // 드래그 가능 요소 생성
      Draggable.create('.drag-proxy', {
        type: 'x',
        trigger: '.box',
        onPress() {
          this.startOffset = SCRUB.vars.position
        },
        onDrag() {
          SCRUB.vars.position =
            this.startOffset + (this.startX - this.x) * 0.001
          SCRUB.invalidate().restart() // ScrollTrigger의 onUpdate와 동일한 작업 수행
        },
        onDragEnd() {
          scrollToPosition(SCRUB.vars.position as number)
        }
      })
    })

    return () => ctx.revert()
  }, [data])

  interface Data {
    artist: string
    title: string
    last_week: string
    rank: number
    award: boolean
    cover: string
    peek_position: string
    weeks_on_chart: string
    image: string
  }

  return (
    <main ref={gsapRef}>
      <div className='boxes'>
        {data.map((item: Data) => (
          <div key={item.artist + item.title} className='box'>
            <img src={item.image} />
            <h3>{item.title}</h3>
          </div>
        ))}

        <div className='controls'>
          <button className='next'>
            <span>Previous album</span>
          </button>
          <button className='prev'>
            <span>Next album</span>
          </button>
        </div>
      </div>
      <div className='drag-proxy'></div>
    </main>
  )
}
