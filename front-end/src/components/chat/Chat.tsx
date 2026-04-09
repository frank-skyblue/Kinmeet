import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useChatInbox } from '../../contexts/chatInboxContext';
import ChatSidebar from './ChatSidebar';
import ChatThread from './ChatThread';

const Chat: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { refetchInbox } = useChatInbox();

  useEffect(() => {
    void refetchInbox();
  }, [userId, refetchInbox]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-kin-beige md:flex-row">
      <aside
        className={`flex min-h-0 shrink-0 flex-col border-kin-stone-200 md:w-80 md:max-w-[40%] md:border-r ${
          userId ? 'hidden md:flex' : 'flex flex-1 md:flex-none'
        }`}
      >
        <ChatSidebar activeUserId={userId} />
      </aside>

      <section
        className={`flex min-h-0 min-w-0 flex-1 flex-col ${
          userId ? 'flex' : 'hidden md:flex'
        }`}
      >
        {userId ? (
          <ChatThread userId={userId} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-kin-beige p-8 text-center">
            <div className="max-w-sm">
              <p className="font-montserrat text-lg font-semibold text-kin-navy">Select a conversation</p>
              <p className="mt-2 font-inter text-sm text-kin-teal">
                Choose someone from the list to read and send messages.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Chat;
