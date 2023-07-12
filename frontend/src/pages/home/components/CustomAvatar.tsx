import AvatarHeader from '@/common/assets/avatar-header.png'
import AvatarImg from "@/common/assets/avatar.svg"
import { Avatar, AvatarFallback, AvatarImage } from '@/common/components/ui/Avatar'
import { Button } from "@/common/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/common/components/ui/dialog"

import AvatarCard from './AvatarCard'


import { cn } from "@/common/lib/utils"
import { Check, Edit2 as EditIcon } from 'lucide-react'
import { useState } from 'react'

type CustomAvatarProps = {
  customClassname?: string
}

const CustomAvatar = ({ customClassname = "" }: CustomAvatarProps) => {
  const [selectedAvatar, setSelectedAvatar] = useState(0)
  return (
    <div className='relative'>
      <Avatar className='w-[200px] h-[200px]'>
        <AvatarImage src={AvatarImg} />
        <AvatarFallback>Avatar</AvatarFallback>
      </Avatar>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="link" className={cn('w-10 h-10 rounded-full bg-[#22A699] hover:bg-[#148378] p-0 border-black absolute right-5 top-10')}>
            <EditIcon fill="white" />
          </Button>
        </DialogTrigger>
        <DialogContent className="flex-col flex items-center sm:max-w-[955px]">
          <DialogHeader>
            <DialogTitle className="text-5xl text-center text-headerTextColor mb-7">
              <img src={AvatarHeader} className='w-52' alt=""></img>
              </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto h-96 w-full">
            <div className="grid grid-cols-5 gap-2 p-2 bg-gray-300">
              {[0,1,2,3,4,5,6,7,8,9,10].map(item => (
                <AvatarCard onClick={() => setSelectedAvatar(item)} isSelected={item === selectedAvatar}/>
              ))} 
            </div>
          </div>
          <DialogFooter>
            <Button type='submit' variant="opacityHover" className='gap-4 mt-2 rounded-full border-8 border-black font-black bg-[#FFE569] p-5'>
              <Check color="white" size={28} strokeWidth={4} />
              <p className="text-lg">
                CONFIRM!
              </p>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CustomAvatar
