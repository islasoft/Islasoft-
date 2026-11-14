import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink } from 'lucide-react';
import PageHeader from '../components/mobile/PageHeader';
import TeamChatPage from './TeamChat';
import EmailTracking from '../components/communications/EmailTracking';
import InternalMessaging from '../components/communications/InternalMessaging';
import ESignature8879 from '../components/communications/ESignature8879';

export default function Communications() {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Communications" showBack={true} />
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Communications</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Email tracking, internal messaging, and team chat</p>
      </div>

      <Tabs defaultValue="emails" className="space-y-6">
        <TabsList>
          <TabsTrigger value="emails">Email Tracking</TabsTrigger>
          <TabsTrigger value="messages">Client Messages</TabsTrigger>
          <TabsTrigger value="team-chat">Team Chat</TabsTrigger>
          <TabsTrigger value="esignature">E-Signature 8879</TabsTrigger>
          <TabsTrigger value="portals">External Portals</TabsTrigger>
        </TabsList>

        <TabsContent value="emails">
          <EmailTracking clients={clients} />
        </TabsContent>

        <TabsContent value="messages">
          <InternalMessaging clients={clients} />
        </TabsContent>

        <TabsContent value="esignature">
          <ESignature8879 clients={clients} />
        </TabsContent>

        <TabsContent value="portals" className="space-y-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">External Portals</h3>
                  <p className="text-sm text-gray-600">Access client and team portals</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="bg-white"
                    onClick={() => window.open('https://islaccounting.securefilepro.com/connect/#/login', '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Client Portal
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-white"
                    onClick={() => window.open('https://authflow.drakesoftware.com/davinci/policy/18c89e219c3f25a2fb19a325afee0816/authorize?client_id=97292bc16fcacf701b53ac92ae338799&redirect_uri=https://authflow.drakesoftware.com/rp/callback/openid_connect&state=00581d8f-4b83-4997-ad42-806ccf68d753&response_type=code&nonce=00581d8f-4b83-4997-ad42-806ccf68d753&transactionId=5da73053-aabb-4c68-8eb5-4206f7d0b065&scope=openid%20profile&request=eyJhbGciOiJSUzI1NiIsImtpZCI6ImRlZmF1bHQifQ.eyJwMU9pZGMiOnsiaWQiOiIwMGIyMTBlMC1hNDFkLTQ3OTAtODAwNi03ZmE0Njk4OTExMzEiLCJlbnZpcm9ubWVudCI6eyJpZCI6IjVmNjQxMjg3LTViMDItNDE3NS05Y2IxLWEyN2MyZjRkZjFlYSJ9LCJhcHBsaWNhdGlvbiI6eyJpZCI6IjlmOWIxMDg4LTBiYjEtNDBiNC04OWE5LTkyYjg0ZDAxNWNkNyJ9LCJyZXF1ZXN0Ijp7Imh0dHAiOnsicmVtb3RlSXAiOiIyNjA3OmZiOTI6OTAxOmI5ODg6ODhkMjpjOGJmOjVjNjA6NWY5ZiIsInVzZXJBZ2VudCI6Ik1vemlsbGEvNS4wIChXaW5kb3dzIE5UIDEwLjA7IFdpbjY0OyB4NjQpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xNDMuMC4wLjAgU2FmYXJpLzUzNy4zNiIsImhlYWRlcnMiOnsiQWNjZXB0LUxhbmd1YWdlIjpbImVuLVVTLGVuO3E9MC45LGVzO3E9MC44Il0sIlgtUGluZy1DdXN0b20tRG9tYWluIjpbImF1dGhmbG93LmRyYWtlc29mdHdhcmUuY29tIl19fSwib2lkYyI6eyJyZXNwb25zZVR5cGVzIjpbImNvZGUiXSwiYWNyVmFsdWVzIjpbXSwic2NvcGVzIjpbImFkZHJlc3MiLCJvcGVuaWQiLCJwcm9maWxlIiwiZW1haWwiXSwicGFyYW1ldGVycyI6eyJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIGFkZHJlc3MiLCJyZXNwb25zZV90eXBlIjoiY29kZSIsImNvZGVfY2hhbGxlbmdlX21ldGhvZCI6IlMyNTYiLCJyZWRpcmVjdF91cmkiOiJodHRwczovL3VzZXIuZHJha2Vzb2Z0d2FyZS5jb20iLCJzdGF0ZSI6IjFveHFvOHkiLCJkcmFrZV9hY2NvdW50IjoiIiwibm9uY2UiOiIxYTI1dXBkIiwiY2xpZW50X2lkIjoiOWY5YjEwODgtMGJiMS00MGI0LTg5YTktOTJiODRkMDE1Y2Q3IiwiY29kZV9jaGFsbGVuZ2UiOiJJT3p2UnJuRmdIRVVEN2tFa0VCak0ybmlFX2p3dmRVX0VNYW1RNHhzQVhzIn19fX19.i5SjWuXNK3L9zMRDkrHEUG6-HQnXVCXSL9LXj_HGWnx6rhFIKUBilriQpIoUSRZs1RL5xTKU2SvxaRP35CDIaVY0kRS0gWeIUxLS1ZxdlDoU5F0onVQW0tyT_bycAxfswxBMnJqMyIz6p3GD3CFh5YaB93kQxxan6pvbcs1dkidICTS1NzpIZNzk7gBVbRgAUFxf9jbWotuRsByAnScStDK9TyQWvs7U156_qIzwOQsKtJZfjSby-iELGM8wevW4T3CGbBLWQ_n6XK9HQze1dimJVIqFNxZHOC1HC37ZFVOu-CF0vbHh3AWeC0wk_PGcoJmhV4EGllpMVyyGZLkX2w', '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Team Portal
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team-chat">
          <TeamChatPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}